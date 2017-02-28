'use strict';

module.exports = function(Tenant) {

	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Tenant.disableRemoteMethodByName('exists'); 					// GET		/resource/:id/exists
	Tenant.disableRemoteMethodByName('findOne');					// GET		/resource/findOne
	Tenant.disableRemoteMethodByName('count');						// GET 		/resource/count
	Tenant.disableRemoteMethodByName('createChangeStream');			// POST		/resource/change-stream
	Tenant.disableRemoteMethodByName('patchOrCreate');				// PATCH	/resource
	Tenant.disableRemoteMethodByName('replaceOrCreate');			// PUT		/resource
	Tenant.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/resource/:id
	Tenant.disableRemoteMethodByName('updateAll');					// POST		/resource/update
	Tenant.disableRemoteMethodByName('upsertWithWhere');			// POST		/resource/upsertWithWhere

	// Disable some relational functions 
	Tenant.disableRemoteMethodByName('prototype.__create__apis');		// POST		/resource/:id/apis
	Tenant.disableRemoteMethodByName('prototype.__findById__apis');		// GET		/resource/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__updateById__apis');	// PUT		/resource/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__destroyById__apis');	// DELETE	/resource/:id/apis/:apiId

	// GET all tenants
	Tenant.beforeRemote('**', function(context, unused, next) {
	    if (context.req.isAdmin) {
	    	next();
	    } else {
	    	var error = new Error();
			error.status = 400;
			error.message = 'You must be admin for this operation.';
			error.code = 'AUTHORIZATION_FAILED';
			error.stack = "";
			next(error);
	    }
	});

};
