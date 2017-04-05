'use strict';

module.exports = function(Api) {

	/**************************
	*	Disable REST functions
	***************************/
	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Api.disableRemoteMethodByName('exists'); 					// GET		/apis/:id/exists
	Api.disableRemoteMethodByName('findOne');					// GET		/apis/findOne
	Api.disableRemoteMethodByName('count');						// GET 		/apis/count
	Api.disableRemoteMethodByName('createChangeStream');		// POST		/apis/change-stream
	Api.disableRemoteMethodByName('patchOrCreate');				// PATCH	/apis
	Api.disableRemoteMethodByName('replaceOrCreate');			// PUT		/apis
	Api.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/apis/:id
	Api.disableRemoteMethodByName('updateAll');					// POST		/apis/update
	Api.disableRemoteMethodByName('upsertWithWhere');			// POST		/apis/upsertWithWhere

	// Disable some relational functions for tenants
	Api.disableRemoteMethodByName('prototype.__get__tenant');			// GET 		/apis/:id/tenant
	
	// Disable some relational functions for clients
	Api.disableRemoteMethodByName('prototype.__create__clients');		// POST		/apis/:id/clients
	Api.disableRemoteMethodByName('prototype.__delete__clients');		// DELETE 	/apis/:id/clients
	Api.disableRemoteMethodByName('prototype.__count__clients');		// GET 		/apis/:id/clients/count
	Api.disableRemoteMethodByName('prototype.__findById__clients');		// GET		/apis/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__updateById__clients');	// PUT		/apis/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__destroyById__clients');	// DELETE	/apis/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__exists__clients');		// HEAD 	/apis/:id/clients/rel/:clientId
	
	/**************************
	*	Validation Checks
	***************************/
	Api.validatesInclusionOf('state', {in: ['enabled', 'disabled', 'deprecated']});
	

	/**************************
	*	Remote Hooks
	***************************/

	// Replace $ref in swagger because it's a reserved keyword in mongodb :-(
	Api.beforeRemote('**', function(context, unused, next) {
		if (context.req.body.swagger) {
			var temp = JSON.stringify(context.req.body.swagger).replace(/\$ref/g, '_ref');
			context.req.body.swagger = JSON.parse(temp);
		}
		next();
	});

	// Replace $ref in swagger because it's a reserved keyword in mongodb :-(
	Api.afterRemote('**', function(context, response, next){
		// Response is one api object
		if (response && response.length == 0 && response.swagger) {
			var temp = JSON.stringify(response.swagger).replace(/_ref/g, '\$ref');
			response.swagger = JSON.parse(temp);
		}

		// Response is an array of apis
		if (response && response.length > 0) {
			for (var i = 0; i < response.length; i++) {
				if (response[i].swagger) {
					var temp = JSON.stringify(response[i].swagger).replace(/_ref/g, '\$ref');
					response[i].swagger = JSON.parse(temp);
				}
			}
		}

		next();
	});

	// GET /apis
	Api.beforeRemote('find', function(context, unused, next) {
	    if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	if (!context.args.filter || !context.args.filter.where) {
		    	// No 'where' filter in request, add where clause to check audience
		    	context.args.filter.where = {or: [{audience: { inq: context.req.user.apiConsumerTenants}}, {audience: []}]};
		    } else {
		    	// 'where' clause in request, add AND clause to check audience
		    	context.args.filter.where = {
					and: [
				    	{ or: [{ audience: { inq: context.req.user.apiConsumerTenants} }, { audience: [] }] },
				    	context.args.filter.where
				   	]
				};
		    }

		    next();
	    }  
	    
	 });

	// GET /apis/{id} - use afterRemote() as no where clause can be set with findById in beforeRemote()
	Api.afterRemote('findById', function(context, response, next) {
		if (!response || context.req.user.isAdmin) {
			next();
		} else {
			// Check if user has role apiConsumer for the audience of the API
			if (checkAudience(response.audience, context.req.user.apiConsumerTenants) || response.audience.length == 0) {
				next();
			} else {
				next(createError(404, 'Unknown "api" id "' + response.id + '".', 'MODEL_NOT_FOUND'));
				return;
			}
		}
		
	 });

	// POST /apis
	Api.beforeRemote('create', function(context, unused, next) {

		// Authorization
		if (!context.req.user.isAdmin) {
	    	// Check that tenantId from body (api) matches one tenant from apiOwner Role from token
			if (!isTenantInArray(context.req.body.tenantId, context.req.user.apiOwnerTenants)) {
				next(createError(400, 'Wrong tenantId in request body.', 'BAD_REQUEST'));
				return;
			}
	    }

	    // Input validation
	    // ApprovalEndpoint must exist if approvalWorkflow = true
		if (context.req.body.approvalWorkflow && !context.req.body.approvalEndpoint) {
			next(createError(400, 'Input validation failed for "approvalEndpoint".', 'BAD_REQUEST'));
			return;	
		}

		// Check if all audiences exist as tenants
		if (!context.req.body.audience) {
			context.req.body.audience = [];
		}
		Api.app.models.Tenant.find({where: { id: { inq: context.req.body.audience}}}, function(err, tenants) {
			if (err || tenants.length != context.req.body.audience.length) {
				next(createError(400, 'Audience does not exist.', 'BAD_REQUEST'));
				return;
			} else {
				context.req.body.updatedBy = context.req.user.sub;
				context.req.body.createdBy = context.req.user.sub;
				next();
			}
  		});
		
	});

	// PUT /apis/{id} and  POST /apis/{id}/replace
	Api.beforeRemote('replaceById', function(context, unused, next) {
		
    	// Read Api first to check authorization
		Api.findById(context.req.params.id, { fields: {tenantId: true, createdBy: true} }, function(err, api) {
			if (err) {
				next(err);
				return;
			}
			
			// Authorization: Is apiOwnerRole allowed to updated this api?	
			if (!context.req.user.isAdmin && !isTenantInArray(api.tenantId, context.req.user.apiOwnerTenants)) {
				next(createError(404, 'Unknown "api" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
				return;
			}

			// tenantId cannot be updated
			if (api.tenantId != context.req.body.tenantId) {
				next(createError(400, 'Attribute "tenantId" cannot be updated.'), 'BAD_REQUEST');
				return;
			}

			// Input validation
		    // ApprovalEndpoint must exist if approvalWorkflow = true
			if (context.req.body.approvalWorkflow && !context.req.body.approvalEndpoint) {
				next(createError(400, 'Input validation failed for "approvalEndpoint".', 'BAD_REQUEST'));
				return;	
			}

			// Check if all audiences exists as tenants
			if (!context.req.body.audience) {
				context.req.body.audience = [];
			}
			Api.app.models.Tenant.find({where: { id: { inq: context.req.body.audience}}}, function(err, tenants) {
				if (err || tenants.length != context.req.body.audience.length) {
					next(createError(400, 'Audience does not exist.', 'BAD_REQUEST'));
					return;
				} else {
					context.req.body.updatedBy = context.req.user.sub;
					context.req.body.createdBy = api.createdBy;
					next();
				}
	  		});
		});
		
	});

	// DELETE /apis/{id}
	Api.beforeRemote('deleteById', function(context, unused, next){
		if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
				if (err) {
					next(err);
				}

				// Check if apiOwnerRole is ok to delete
				if (api && isTenantInArray(api.tenantId, context.req.user.apiOwnerTenants)) {
					next();
				} else {
					next(createError(404, 'Unknown "api" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
					return;
				}

			});
	    }

		
	});

	// GET /apis/{id}/clients
	Api.beforeRemote('prototype.__get__clients', function(context, unused, next) {
		
		if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	// Read Api first to check authorization
			Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
				if (err) {
					next(err);
					return;
				}

				// Is apiOwnerRole allowed to read this api?	
				if (!isTenantInArray(api.tenantId, context.req.user.apiOwnerTenants)) {
					next(createError(404, 'Unknown "api" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
					return;
				} else {
					next();
				}

			});
	    }

		
	});

	// PUT /apis/{id}/clients/rel/{clientId}
	Api.beforeRemote('prototype.__link__clients', function(context, unused, next) {
		
		// Note: Api must exist, this is checked by loopback when calling /apis/{id}/...

    	// Check if client exists (seems to be a bug in strongloop that this is not checked out-of-the-box)
		Api.app.models.Client.findById(context.req.params.fk, function(err, client) {
			if (err) {
				next(err);
				return;
			}

			if (!client) {
				next(createError(404, 'Unknown "client" id "' + context.req.params.fk + '".', 'MODEL_NOT_FOUND'));
				return;	
			}

			// If the client has a tenantId it must match one of apiConsumerTenants
			if (!context.req.user.isAdmin && client.tenantId && !isTenantInArray(client.tenantId, context.req.user.apiConsumerTenants)) {
				next(createError(404, 'Unknown "client" id "' + context.req.params.fk + '".', 'MODEL_NOT_FOUND'));
				return;	
			}

			// Read Api to check authorization
			Api.findById(context.req.params.id, { fields: {tenantId: true, audience: true} }, function(err, api) {
				if (err) {
					next(err);
					return;
				}				

				// Not-Public APIs need further validation
				if (api.audience.length != 0) {
					
					// Check that at least one audience of the api is in the apiConsumerRoles
					if (!context.req.user.isAdmin && !checkAudience(api.audience, context.req.user.apiConsumerTenants)) {
						next(createError(404, 'could not find a model with id ' + context.req.params.id, 'MODEL_NOT_FOUND'));
						return;
					}

					// Check that at least one audience matches the tenantId of the client
					if (!client.tenantId || !isTenantInArray(client.tenantId, api.audience)) {
						next(createError(400, 'Client ' + context.req.params.fk + ' is not allowed to be registered to the API '+ context.req.params.id + '.', 'BAD_REQUEST'));
						return;
					}
				}

				context.req.body.createdBy = context.req.user.sub;
				context.req.body.updatedBy = context.req.user.sub;
				next();
			});

		});	

	});

	// DELETE /apis/{id}/clients/rel/{clientId}
	Api.beforeRemote('prototype.__unlink__clients', function(context, unused, next) {
		
		// Check if client exists (seems to be a bug in strongloop that this is not checked out-of-the-box)
		Api.app.models.Client.findById(context.req.params.fk, function(err, client) {
			if (err) {
				next(err);
				return;
			}

			// Note: Api must exist, this is checked by loopback when calling /apis/{id}/...

			if (!client) {
				next(createError(404, 'Unknown "client" id "' + context.req.params.fk + '".', 'MODEL_NOT_FOUND'));
				return;	
			}

			// If the client has a tenantId it must match one of apiConsumerTenants
			// If the client has no tenantId the createdBy user must match the current user
			if (!context.req.user.isAdmin && 
				((client.tenantId && !isTenantInArray(client.tenantId, context.req.user.apiConsumerTenants)) || 
				(!client.tenantId && client.createdBy != context.req.user.sub))) {
				next(createError(404, 'Unknown "client" id "' + context.req.params.fk + '".', 'MODEL_NOT_FOUND'));
				return;	
			}

			next();

		});	
	});

	/**************************
	*	Helper Functions
	***************************/

	function isTenantInArray(tenantId, tenants) {
		var isOk = false;
		for (var i = 0; i < tenants.length; i++) {
			if (tenants[i] == tenantId) {
				isOk = true;
				break;
			} 
		}
		return isOk;
	}

	/**
 	* @description determine if an array contains one or more items from another array.
 	* @param {array} audience the array to search.
 	* @param {array} apiConsumers the array providing items to check for in the audience.
 	* @return {boolean} true|false if audience contains at least one item from apiConsumers.
 	*/
	function checkAudience(audience, apiConsumers) {
		return apiConsumers.some(function (v) {
        	return audience.indexOf(v) >= 0;
    	});
	}

	function createError(status, message, code) {
		var error = new Error();
		error.status = status;
		error.message = message;
		error.code = code;
		return error;
	}

};
