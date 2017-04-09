'use strict';

module.exports = function(Client) {
	
	/**************************
	*	Disable REST functions
	***************************/
	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Client.disableRemoteMethodByName('exists'); 					// GET		/clients/:id/exists
	Client.disableRemoteMethodByName('findOne');					// GET		/clients/findOne
	Client.disableRemoteMethodByName('count');						// GET 		/clients/count
	Client.disableRemoteMethodByName('createChangeStream');			// POST		/clients/change-stream
	Client.disableRemoteMethodByName('patchOrCreate');				// PATCH	/clients
	Client.disableRemoteMethodByName('replaceOrCreate');			// PUT		/clients
	Client.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/clients/:id
	Client.disableRemoteMethodByName('updateAll');					// POST		/clients/update
	Client.disableRemoteMethodByName('upsertWithWhere');			// POST		/clients/upsertWithWhere

	// Disable some relational functions for clients
	Client.disableRemoteMethodByName('prototype.__create__apis');		// POST		/clients/:id/apis
	Client.disableRemoteMethodByName('prototype.__delete__apis');		// DELETE 	/clients/:id/apis
	Client.disableRemoteMethodByName('prototype.__count__apis');		// GET 		/clients/:id/apis/count
	Client.disableRemoteMethodByName('prototype.__findById__apis');		// GET		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__updateById__apis');	// PUT		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__destroyById__apis');	// DELETE	/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__exists__apis');		// HEAD 	/clients/:id/apis/rel/:apiId
	Client.disableRemoteMethodByName('prototype.__link__apis');			// PUT		/clients/:id/apis/rel/:apiId
	Client.disableRemoteMethodByName('prototype.__unlink__apis');		// DELETE	/clients/:id/apis/rel/:apiId


	/**************************
	*	Remote Hooks
	***************************/
	
	// **************************************************
	// POST /clients
	// **************************************************
	Client.beforeRemote('create', function(context, unused, next) {
		// *** BEGIN input completion ***
		// ignore input in 'createdAt' and 'updatedAt' and set current time instead
		var jsonDateTime = (new Date()).toJSON();
		context.req.body.createdAt = jsonDateTime;
		context.req.body.updatedAt = jsonDateTime;
		
		// ignore input in 'createdBy' and 'updatedBy' and set current subject instead
		var sub = context.req.user.sub;
		context.req.body.createdBy = sub;
		context.req.body.updatedBy = sub;
		// *** END input completion ***
		
		// *** BEGIN check the correctness of the tenantId entry ***
		if (context.req.body.tenantId.length > 0 ) {
			Client.app.models.Tenant.find({where: { id: context.req.body.tenantId}}, function(err, tenant) {
				if (err || tenant.length != context.req.body.tenantId.length) {
					next(createError(400, 'Tenant does not exist.', 'BAD_REQUEST'));
					return;
				} 
	  		});
		}
  		// *** END check the correctness of the tenantId entry ***
  			
  		// *** BEGIN authorization ***
		if (!context.req.user.isAdmin) {
	    	// Check that the filled tenantId from request body matches one of tenants from apiConsumer role from token
			if (context.req.body.tenantId.length > 0 ) {
				if (!isTenantInArray(context.req.body.tenantId, context.req.user.apiConsumerTenants)) {
					next(createError(400, 'Wrong tenantId in request body.', 'BAD_REQUEST'));
					return;
				}
			}
	    } 
		// *** END authorization ***
		
	    // *** BEGIN input validation ***
	    // client name and contact must be filled
		if (!context.req.body.name || context.req.body.name.length == 0 ) {
			next(createError(400, 'Input validation failed: client name is empty', 'BAD_REQUEST'));
			return;	
		}
		if (!context.req.body.contact || context.req.body.contact.length == 0 ) {
			next(createError(400, 'Input validation failed: client contact is empty', 'BAD_REQUEST'));
			return;	
		} else {
			next();
		}
		// *** END input validation ***
	});
	
	
	// **************************************************
	// PUT /clients/{id} and POST /clients/{id}/replace
	// **************************************************
	Client.beforeRemote('replaceById', function(context, unused, next) {
		// *** BEGIN reading the existing client byId and complete the input  ***
		Client.findById(context.req.params.id, { fields: {name: true, contact: true, tenantId: true, createdBy: true, createdAt: true} }, function(err, client) {
			if (err) {
				next(err);
				return;
			}
			if (!client) {
				next(createError(404, 'Unknown "client" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
				return;
			}
			
			var jsonDateTime = (new Date()).toJSON();
			context.req.body.updatedAt = jsonDateTime;
			context.req.body.createdAt = client.createdAt;
			
			var sub = context.req.user.sub;
			context.req.body.updatedBy = sub;
			context.req.body.createdBy = client.createdBy;
			
			if (!context.req.body.name) {
				context.req.body.name = client.name;	
			}
			if (!context.req.body.contact) {
				context.req.body.name = client.contact;	
			}
			if (client.tenantId.length > 0 && (!context.req.body.tenantId || context.req.body.tenantId.length == 0 )) {
				context.req.body.tenantId = client.tenantId;	
			}
		});
		// *** END reading the existing client byId and complete the input ***
		
		// *** BEGIN check the correctness of the tenantId entry ***
		if (context.req.body.tenantId.length > 0 ) {
			Client.app.models.Tenant.find({where: { id: context.req.body.tenantId}}, function(err, tenant) {
				if (err || tenant.length != context.req.body.tenantId.length) {
					next(createError(400, 'Tenant does not exist.', 'BAD_REQUEST'));
					return;
				} 
	  		});
		}
  		// *** END check the correctness of the tenantId entry ***
  			
  		// *** BEGIN authorization ***
		if (!context.req.user.isAdmin) {
	    	// Check that the filled tenantId from request body matches one of tenants from apiConsumer role from token
			if (context.req.body.tenantId.length > 0 ) {
				if (!isTenantInArray(context.req.body.tenantId, context.req.user.apiConsumerTenants)) {
					next(createError(400, 'Wrong tenantId in request body.', 'BAD_REQUEST'));
					return;
				}
			}
			// Check that the subject is the same person, which has created this client:
			if (context.req.user.sub != context.req.body.createdBy) {
				next(createError(403, 'No permissions for this action. You must be creator of this client entry.', 'FORBIDDEN'));
				return;
			} else {
				next();
			}
	    } 
		// *** END authorization ***
		
	});

	
	// **************************************************
	// DELETE /clients/{id}
	// **************************************************
	Client.beforeRemote('deleteById', function(context, unused, next) {
		var creator = "";
		var tenant = "";
		
		// *** BEGIN reading the existing client byId inkluding check of api relations ***
		Client.findById(context.req.params.id, { fields: {tenantId: true, createdBy: true}, include: {relation: 'apis', scope: {limit: 1}} }, function(err, client) {
			if (err) {
				next(err);
				return;
			}
			if (!client) {
				next(createError(404, 'Unknown "client" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
				return;
			}
			if (client.apis.count > 0) {
				next(createError(409, 'This client is still registered by at least one API.', 'CONFLICT'));
				return;
			}
			
			creator = client.createdBy;
			tenant = client.tenantId;
		});
		// *** END reading the existing client byId inkluding check of api relations ***
		
		
  		// *** BEGIN authorization ***
		if (!context.req.user.isAdmin) {
	    	// Check that the filled tenantId from request body matches one of tenants from apiConsumer role from token
			if (tenant.length > 0 ) {
				if (!isTenantInArray(tenant, context.req.user.apiConsumerTenants)) {
					next(createError(403, 'Wrong permissions for this tenant.', 'FORBIDDEN'));
					return;
				}
			}
			// Check that the subject is the same person, which has created this client:
			if (context.req.user.sub != creator) {
				next(createError(403, 'No permissions for this action. You must be creator of this client entry.', 'FORBIDDEN'));
				return;
			} else {
				next();
			}
	    } 
		// *** END authorization ***
	});	
	
	
	// **************************************************
	// GET /clients
	// **************************************************
	Client.beforeRemote('find', function(context, unused, next) {
	    if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	if (!context.args.filter || !context.args.filter.where) {
		    	// No 'where' filter in request, add where clause to check audience
		    	context.args.filter.where = { or:	[
		    											{ tenantId: { inq: context.req.user.apiConsumerTenants }}, 
		    											{ createdBy: context.req.user.sub }
		    										] 
		    								};
		    } else {
		    	// 'where' clause in request, add AND clause to check audience
		    	context.args.filter.where = { and:	[
					    								{ or:	[
					    											{ tenantId: { inq: context.req.user.apiConsumerTenants }}, 
					    											{ createdBy: context.req.user.sub }
					    										] 
					    								},
				    									context.args.filter.where
				   									]
											};
		    }
			next();
	    }  
	    
	});	
	 
	 
	// **************************************************
	// GET /clients/{id} - use afterRemote() as no where clause can be set with findById in beforeRemote()
	// **************************************************
	Client.afterRemote('findById', function(context, response, next) {
		if (!response || context.req.user.isAdmin) {
			next();
		} else {
			// Check that the tenantId from response body matches one of tenants from apiConsumer role from token
			if (!isTenantInArray(response.tenantId, context.req.user.apiConsumerTenants)) {
				next(createError(403, 'No permissions for this action. Forbidden tenantId.', 'FORBIDDEN'));
				return;
			}
			
			// Check, if tenantId from response body is empty, weither the subject is the same person, which has created this client
			if (response.tenantId.length == 0 || !response.tenantId) {
				if (context.req.user.sub != response.createdBy) {
					next(createError(403, 'No permissions for this action. You must be creator of this client entry.', 'FORBIDDEN'));
					return;
				} 
			} 
			
			if (!response) {
				next(createError(404, 'Unknown "client" id "' + response.id + '".', 'MODEL_NOT_FOUND'));
				return;
			} else {
				next();
			}
		}
		
	});
	 

	// **************************************************
	// GET /clients/{id}/apis
	// **************************************************
	Client.beforeRemote('prototype.__get__apis', function(context, unused, next) {
		if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	// Read client first to check authorization
			Client.findById(context.req.params.id, { fields: {tenantId: true, createdBy: true} }, function(err, client) {
				if (err) {
					next(err);
					return;
				}
				
				// Check that the tenantId from the client matches one of tenants from apiConsumer role from token
				if (!isTenantInArray(client.tenantId, context.req.user.apiConsumerTenants)) {
					next(createError(403, 'No permissions for this action. Forbidden tenantId.', 'FORBIDDEN'));
					return;
				}
				
				// Check, if tenantId of the client is empty, weither the subject is the same person, which has created this client
				if (client.tenantId.length == 0 || !client.tenantId) {
					if (context.req.user.sub != client.createdBy) {
						next(createError(403, 'No permissions for this action. You must be creator of this client entry', 'FORBIDDEN'));
						return;
					} 
				} 
			
				if (!client) {
					next(createError(404, 'Unknown "client" id "' + client.id + '".', 'MODEL_NOT_FOUND'));
					return;
				} else {
					next();
				}

			});
	    }
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

	function createError(status, message, code) {
		var error = new Error();
		error.status = status;
		error.message = message;
		error.code = code;
		return error;
	}
};
