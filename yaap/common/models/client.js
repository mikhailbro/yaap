'use strict';

module.exports = function(Client) {

	/**************************
	*	Disable REST functions
	***************************/
	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Client.disableRemoteMethodByName('exists'); 										// GET		/clients/:id/exists
	Client.disableRemoteMethodByName('findOne');										// GET		/clients/findOne
	Client.disableRemoteMethodByName('count');											// GET 		/clients/count
	Client.disableRemoteMethodByName('createChangeStream');					// POST		/clients/change-stream
	Client.disableRemoteMethodByName('patchOrCreate');							// PATCH	/clients
	Client.disableRemoteMethodByName('replaceOrCreate');						// PUT		/clients
	Client.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/clients/:id
	Client.disableRemoteMethodByName('updateAll');									// POST		/clients/update
	Client.disableRemoteMethodByName('upsertWithWhere');						// POST		/clients/upsertWithWhere

	// Disable some relational functions for clients
	Client.disableRemoteMethodByName('prototype.__create__apis');				// POST		/clients/:id/apis
	Client.disableRemoteMethodByName('prototype.__delete__apis');				// DELETE /clients/:id/apis
	Client.disableRemoteMethodByName('prototype.__count__apis');				// GET 		/clients/:id/apis/count
	Client.disableRemoteMethodByName('prototype.__findById__apis');			// GET		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__updateById__apis');		// PUT		/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__destroyById__apis');	// DELETE	/clients/:id/apis/:apiId
	Client.disableRemoteMethodByName('prototype.__exists__apis');				// HEAD 	/clients/:id/apis/rel/:apiId
	Client.disableRemoteMethodByName('prototype.__link__apis');					// PUT		/clients/:id/apis/rel/:apiId
	Client.disableRemoteMethodByName('prototype.__unlink__apis');				// DELETE	/clients/:id/apis/rel/:apiId


	/**************************
	*	Validation Checks
	***************************/
	Client.validatesInclusionOf('type', {in: ['public', 'confidential']});


	/**************************
	*	Remote Hooks
	***************************/

	// **************************************************
	// POST /clients
	// **************************************************
	Client.beforeRemote('create', function(context, unused, next) {

		if (!context.req.user.isAuthenticated) {
				return next(createError(401, 'Unauthorized', 'UNAUTHORIZED'));
		}

		inputvalidationClient(context.req.body, context.req.user, Client.app.models.Tenant, function (err, data) {
			if (err) return next(err);

			// Complete body to be saved into database
			context.req.body.updatedBy = context.req.user.sub;
			context.req.body.createdBy = context.req.user.sub;
			next();
		})
	});


	// **************************************************
	// PUT /clients/{id} and POST /clients/{id}/replace
	// **************************************************
	Client.beforeRemote('replaceById', function(context, unused, next) {

		if (!context.req.user.isAuthenticated) {
				return next(createError(401, 'Unauthorized', 'UNAUTHORIZED'));
		}

		// Reading the existing client byId and complete the input
		Client.findById(context.req.params.id, { fields: {name: true, contact: true, tenantId: true, createdBy: true, createdAt: true} }, function(err, client) {
			if (err) return next(err);

			if (!client) {
				return next(createError(404, 'Unknown "client" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
			}

			// Check that the subject is the same person, which has created this client (only for clients without a tenantId)
			if (!client.tenantId && context.req.user.sub != client.createdBy) {
				return next(createError(403, 'No permissions for this action. You must be creator of this client entry.', 'FORBIDDEN'));
			}

			inputvalidationClient(context.req.body, context.req.user, Client.app.models.Tenant, function (err, data) {
				if (err) return next(err);

				context.req.body.createdBy = client.createdBy;
				context.req.body.updatedBy = context.req.user.sub;
				next();
			});
		});
	});


	// **************************************************
	// DELETE /clients/{id}
	// **************************************************
	Client.beforeRemote('deleteById', function(context, unused, next) {
		var creator = "";
		var tenant = "";

		// *** BEGIN reading the existing client byId including check of api relations ***
		Client.findById(context.req.params.id, {include: 'apis'}, function(err, client) {
			if (err) return next(err);

			if (!client) {
				return next(createError(404, 'Unknown client id: ' + context.req.params.id, 'MODEL_NOT_FOUND'));
			}
			var c = client.toJSON(); // http://loopback.io/doc/en/lb3/Include-filter.html#access-included-objects
			if (c.apis.length > 0) {
				return next(createError(409, 'This client is still registered by at least one API.', 'CONFLICT'));
			} else {
				creator = client.createdBy;
				tenant = client.tenantId;

				// *** BEGIN authorization ***
				if (!context.req.user.isAdmin) {
			    // Check that the tenantId of the client matches one of tenants from apiConsumer role from token
					if (tenant.length > 0 ) {
						if (!isTenantInArray(tenant, context.req.user.apiConsumerTenants)) {
							return next(createError(403, 'Wrong permissions for this tenant.', 'FORBIDDEN'));
						}
						// Check that the subject is the same person, which has created this client:
					} else if (context.req.user.sub != creator) {
						return next(createError(403, 'No permissions for this action. You must be creator of this client entry.', 'FORBIDDEN'));
					}
			    }
				// *** END authorization ***
			}

			next();

		});
		// *** END reading the existing client byId including check of api relations ***


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
					if (!context.args.filter) {
						context.args.filter = {};
					}
					if (context.req.user.sub) {
						context.args.filter.where = { or:
							[
			    			{ tenantId: { inq: context.req.user.apiConsumerTenants }},
			    			{ createdBy: context.req.user.sub }
			    		]
			    	};
					} else {
						context.args.filter.where = { tenantId: { inq: context.req.user.apiConsumerTenants }};
					}
		    } else {
		    	// 'where' clause in request, add AND clause to check consumerTenants
		    	context.args.filter.where = { and: [
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
			// If client belongst to a tenant, check that the tenantId from response body matches one of tenants from apiConsumer role from token
			if (response.tenantId && !isTenantInArray(response.tenantId, context.req.user.apiConsumerTenants)) {
				return next(createError(403, 'No permissions for this action. Forbidden tenantId.', 'FORBIDDEN'));
			}

			// Check, if tenantId from response body is empty, weither the subject is the same person, which has created this client
			if (!response.tenantId) {
				if (context.req.user.sub != response.createdBy) {
					return next(createError(404, 'Unknown \"Client\" id \"' + response.id + '\".', 'FORBIDDEN'));
				}
			}

			next();
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
				if (err) return next(err);

				// Check that the tenantId from the client matches one of tenants from apiConsumer role from token
				if (!isTenantInArray(client.tenantId, context.req.user.apiConsumerTenants)) {
					return next(createError(403, 'No permissions for this action. Forbidden tenantId.', 'FORBIDDEN'));
				}

				// Check, if tenantId of the client is empty, weither the subject is the same person, which has created this client
				if (client.tenantId.length == 0 || !client.tenantId) {
					if (context.req.user.sub != client.createdBy) {
						return next(createError(403, 'No permissions for this action. You must be creator of this client entry', 'FORBIDDEN'));
					}
				}

				if (!client) {
					return next(createError(404, 'Unknown "client" id "' + client.id + '".', 'MODEL_NOT_FOUND'));
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

	function inputvalidationClient(body, user, Tenant, callback) {
		// Verfiy that callback is a function
		if (!(typeof (callback) === 'function')) {
    	callback = function() {};  // If callback is not a fuction set it to neutral function
  	}

		// Authorization
		if (!user.isAdmin) {
	  	// Check that the filled tenantId from request body matches one of tenants from apiConsumer role from token
			if (body.tenantId && body.tenantId.length > 0 ) {
				if (!isTenantInArray(body.tenantId, user.apiConsumerTenants)) {
					return callback(createError(400, 'Wrong tenantId in request body.', 'BAD_REQUEST'));
				}
			}
	 	}

		// Validate x509CertificateChain (optional)
  	if (body.x509CertificateChain) {
  		if (body.x509CertificateChain.length < 2) {
  			return callback(createError(400, 'Certificate chain must at least have two certificates.', 'BAD_REQUEST'));
  		}
  	}

  	// Secret cannot be set via API, it's always generated by our API runtime server-side
  	if (body.secret) {
  		return callback(createError(400, 'Secret cannot be set via API.', 'BAD_REQUEST'));
  	}

		// Check the correctness of the tenantId entry
		if (body.tenantId && body.tenantId.length > 0 ) {
			Tenant.find({where: { id: body.tenantId}}, function(err, tenant) {
				if (err || tenant.length <= 0) {
					return callback(createError(404, 'Client tenant does not exist.', 'NOT_FOUND'));
				} else {
					return callback(null, true);
				}
	  	});
		} else {
			return callback(null, true);
		}
	}
};
