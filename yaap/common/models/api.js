'use strict';

module.exports = function(Api) {
	
	var uuid = require('node-uuid');

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
	// GET /apis
	Api.beforeRemote('find', function(context, unused, next) {
	    if (!context.args.filter || !context.args.filter.where) {
	    	// No 'where' filter in request, add where clause to check audience
	    	context.args.filter = {where: {or: [{audience: { inq: context.req.apiConsumerTenants}}, {audience: []}]}};
	    } else {
	    	// 'where' clause in request, add AND clause to check audience
	    	context.args.filter.where = {
				and: [
			    	{ or: [{ audience: { inq: context.req.apiConsumerTenants} }, { audience: [] }] },
			    	context.args.filter.where
			   	]
			};
    	
	    }
	    next();
	 });

	// GET /apis/{id} - use afterRemote() as no where clause can be set with findById in beforeRemote()
	Api.afterRemote('findById', function(context, response, next) {
		if (!response) {
			next();
			return;
		}
		
		// Check if user has role apiConsumer for the audience of the API
		if (checkAudience(response.audience, context.req.apiConsumerTenants) || response.audience.length == 0) {
			next();
		} else {
			next(createError(404, 'Unknown "api" id "' + response.id + '".', 'MODEL_NOT_FOUND'));
		}
	 });

	// POST /apis
	Api.beforeRemote('create', function(context, unused, next) {
		
		// Check that tenantId from body (api) matches one tenant from apiOwner Role from token
		if (!isTenantInArray(context.req.body.tenantId, context.req.apiOwnerTenants)) {
			next(createError(400, 'Wrong tenantId in request body.', 'BAD_REQUEST'));
			return;
		}

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
			if(err || tenants.length != context.req.body.audience.length) {
				next(createError(400, 'Audience does not exist.', 'BAD_REQUEST'));
			} else {
				var newId = uuid.v4();
				context.req.body.id = newId;
				next();	
			}
  		});
		
	});

	// PUT /apis/{id} and  POST /apis/{id}/replace
	Api.beforeRemote('replaceById', function(context, unused, next) {
		// Read Api first to check authorization
		Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
			if (err) {
				console.log(err);
				next(err);
				return;
			}
			
			// Is apiOwnerRole allowed to updated this api?	
			if (!isTenantInArray(api.tenantId, context.req.apiOwnerTenants)) {
				next(createError(404, 'Unknown "api" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
			}

			// tenantId cannot be updated
			if (api.tenantId != context.req.body.tenantId) {
				next(createError(400, 'Attribute "tenantId" cannot be updated.'), 'BAD_REQUEST');
			}

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
				if(err || tenants.length != context.req.body.audience.length) {
					next(createError(400, 'Audience does not exist.', 'BAD_REQUEST'));
				} else {
					next();	
				}
	  		});

		});
	});

	// DELETE /apis/{id}
	Api.beforeRemote('deleteById', function(context, unused, next){
		Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
			if (err) {
				console.log(err);
				next(err);
			}

			// Check if apiOwnerRole is ok to delete
			if (api && isTenantInArray(api.tenantId, context.req.apiOwnerTenants)) {
				next();
			} else {
				next(createError(404, 'Unknown "api" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
			}

		});
	});

	// GET /apis/{id}/clients
	Api.beforeRemote('prototype.__get__clients', function(context, unused, next) {

	});

	// PUT /apis/{id}/clients/rel/{clientId}
	Api.beforeRemote('prototype.__link__clients', function(context, unused, next) {
		// TODO
	});

	// DELETE /apis/{id}/clients/rel/{clientId}
	Api.beforeRemote('prototype.__unlink__clients', function(context, unused, next) {
		// TODO
	});


	/**************************
	*	Helper Functions
	***************************/
	function isTenantInArray(tenantId, tenants) {
		// NOTE: array.indexOf() doesn't seem to work with mongodb generated ids....
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
