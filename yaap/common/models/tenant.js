'use strict';

module.exports = function(Tenant) {

	var uuid = require('node-uuid');

	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Tenant.disableRemoteMethodByName('exists'); 					// GET		/tenants/:id/exists
	Tenant.disableRemoteMethodByName('findOne');					// GET		/tenants/findOne
	Tenant.disableRemoteMethodByName('count');						// GET 		/tenants/count
	Tenant.disableRemoteMethodByName('createChangeStream');			// POST		/tenants/change-stream
	Tenant.disableRemoteMethodByName('patchOrCreate');				// PATCH	/tenants
	Tenant.disableRemoteMethodByName('replaceOrCreate');			// PUT		/tenants
	Tenant.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/tenants/:id
	Tenant.disableRemoteMethodByName('updateAll');					// POST		/tenants/update
	Tenant.disableRemoteMethodByName('upsertWithWhere');			// POST		/tenants/upsertWithWhere

	// Disable some relational functions 
	Tenant.disableRemoteMethodByName('prototype.__create__apis');		// POST		/tenants/:id/apis
	Tenant.disableRemoteMethodByName('prototype.__findById__apis');		// GET		/tenants/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__updateById__apis');	// PUT		/tenants/:id/apis/:apiId
	Tenant.disableRemoteMethodByName('prototype.__destroyById__apis');	// DELETE	/tenants/:id/apis/:apiId

	// all operations
	Tenant.beforeRemote('**', function(context, unused, next) {
	    if (context.req.isAdmin) {
	    	next();
	    } else {
	    	var error = new Error();
			error.status = 400;
			error.message = 'You must be admin for this operation.';
			error.code = 'AUTHORIZATION_FAILED';
			next(error);
	    }
	});

	Tenant.beforeRemote('create', function(context, unused, next) {
	    if (context.req.isAdmin) {
	    	var newId = uuid.v4();
			context.req.body.id = newId;
	    	next();
	    } else {
	    	var error = new Error();
			error.status = 400;
			error.message = 'You must be admin for this operation.';
			error.code = 'AUTHORIZATION_FAILED';
			next(error);
	    }
	});

};
