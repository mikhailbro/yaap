'use strict';

module.exports = function(Tenant) {

	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Tenant.disableRemoteMethodByName('exists'); 										// GET		/tenants/:id/exists
	Tenant.disableRemoteMethodByName('findOne');										// GET		/tenants/findOne
	Tenant.disableRemoteMethodByName('count');											// GET 		/tenants/count
	Tenant.disableRemoteMethodByName('createChangeStream');					// POST		/tenants/change-stream
	Tenant.disableRemoteMethodByName('patchOrCreate');							// PATCH	/tenants
	Tenant.disableRemoteMethodByName('replaceOrCreate');						// PUT		/tenants
	Tenant.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/tenants/:id
	Tenant.disableRemoteMethodByName('updateAll');									// POST		/tenants/update
	Tenant.disableRemoteMethodByName('upsertWithWhere');						// POST		/tenants/upsertWithWhere

	// Disable some relational functions
	Tenant.disableRemoteMethodByName('prototype.__create__apis');					// POST		/tenants/:id/apis
	Tenant.disableRemoteMethodByName('prototype.__findById__apis');				// GET		/tenants/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__updateById__apis');			// PUT		/tenants/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__destroyById__apis');		// DELETE	/tenants/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__count__apis');					// GET 		/tenants/:id/apis/count

	Tenant.disableRemoteMethodByName('prototype.__create__clients');			// POST		/tenants/:id/clients
	Tenant.disableRemoteMethodByName('prototype.__findById__clients');		// GET		/tenants/:id/clients/:clientId
	Tenant.disableRemoteMethodByName('prototype.__updateById__clients');	// PUT		/tenants/:id/clients/:clientId
	Tenant.disableRemoteMethodByName('prototype.__destroyById__clients');	// DELETE	/tenants/:id/clients/:clientId
	Tenant.disableRemoteMethodByName('prototype.__count__clients');				// GET 		/tenants/:id/clients/count

	// all operations
	Tenant.beforeRemote('**', function(context, unused, next) {
	    if (context.req.user.isAdmin || context.req.method == "GET") {
	    	context.req.body.updatedBy = context.req.user.sub;
				context.req.body.createdBy = context.req.user.sub;
	    	next();
	    } else {
				return next(createError(400, 'You must be admin for this operation.', 'AUTHORIZATION_FAILED'));
	    }
	});

	/********************
	* GET /tenants
	********************/
	Tenant.beforeRemote('find', function(context, unused, next) {
		if (context.req.user.isAdmin) {
	    next();
	 	} else {
	  	return next(createError(400, 'You must be admin for this operation.', 'AUTHORIZATION_FAILED'));
		}
	});

	/********************
	* GET /tenants/{id}
	********************/
	Tenant.beforeRemote('findById', function(context, unused, next) {
		if (context.req.user.isAdmin) {
	    next();
	 	} else {
	  	return next(createError(400, 'You must be admin for this operation.', 'AUTHORIZATION_FAILED'));
		}
	});

	/********************
	* GET /tenants/{id}/clients
	********************/
	Tenant.beforeRemote('prototype.__get__clients', function(context, unused, next) {

		if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	// Read Tenant first to check authorization
			Tenant.findById(context.req.params.id, function(err, tenant) {
				if (err) return next(err);

				// Is user in apiConsumerRole or apiOwnerRole of this tenant?
				if (!isTenantInArray(tenant.id, context.req.user.apiOwnerTenants) && !isTenantInArray(tenant.id, context.req.user.apiConsumerTenants)) {
					return next(createError(404, 'Unknown "tenant" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
				} else {
					next();
				}
			});
	 	}
	});

	/********************
	* GET /tenants/{id}/apis
	********************/
	Tenant.beforeRemote('prototype.__get__apis', function(context, unused, next) {

		if (context.req.user.isAdmin) {
	    	next();
	    } else {
	    	// Read Tenant first to check authorization
			Tenant.findById(context.req.params.id, function(err, tenant) {
				if (err) return next(err);

				// Is user in apiConsumerRole or apiOwnerRole of this tenant?
				if (!isTenantInArray(tenant.id, context.req.user.apiOwnerTenants) && !isTenantInArray(tenant.id, context.req.user.apiConsumerTenants)) {
					return next(createError(404, 'Unknown "tenant" id "' + context.req.params.id + '".', 'MODEL_NOT_FOUND'));
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
