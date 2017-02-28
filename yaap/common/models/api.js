'use strict';

module.exports = function(Api) {

	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Api.disableRemoteMethodByName('exists'); 					// GET		/resource/:id/exists
	Api.disableRemoteMethodByName('findOne');					// GET		/resource/findOne
	Api.disableRemoteMethodByName('count');						// GET 		/resource/count
	Api.disableRemoteMethodByName('createChangeStream');		// POST		/resource/change-stream
	Api.disableRemoteMethodByName('patchOrCreate');				// PATCH	/resource
	Api.disableRemoteMethodByName('replaceOrCreate');			// PUT		/resource
	Api.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/resource/:id
	Api.disableRemoteMethodByName('updateAll');					// POST		/resource/update
	Api.disableRemoteMethodByName('upsertWithWhere');			// POST		/resource/upsertWithWhere

	// Disable some relational functions 
	Api.disableRemoteMethodByName('prototype.__create__clients');		// POST		/resource/:id/clients
	Api.disableRemoteMethodByName('prototype.__findById__clients');		// GET		/resource/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__updateById__clients');	// PUT		/resource/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__destroyById__clients');	// DELETE	/resource/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__count__clients');		// GET 		/resource/:id/clients/count
	Api.disableRemoteMethodByName('prototype.__link__clients');
	Api.disableRemoteMethodByName('prototype.__unlink__clients');

	// GET /apis
	Api.beforeRemote('find', function(context, unused, next) {
	    if (!context.args.filter || !context.args.filter.where) {
	    	// No 'where' filter in request, add where clause to check audience
	    	context.args.filter = {where: { tenantId: { inq: context.req.apiConsumerTenants}}};
	    } else {
	    	// 'where' clause in request, add AND clause to check audience
	    	context.args.filter.where = {and: [{tenantId: { inq: context.req.apiConsumerTenants}}, context.args.filter.where] };
	    }
	    next();
	 });

	// POST /apis
	Api.beforeRemote('create', function(context, unused, next) {
		// Check that tenantId from body matches one tenant from apiOwner Role from token
		if (isTenantOk(context.req.body.tenantId, context.req.apiOwnerTenants)) {
			next();
		} else {
			var error = new Error();
			error.status = 400;
			error.message = 'Wrong tenantId in request body.';
			error.code = 'BAD_REQUEST';
			error.stack = "";
			next(error);
		}
	});

	// GET /apis/{id}
	//check response as no where clause can be set in beforeRemote()
	Api.afterRemote('findById', function(context, response, next) {
		if (!response) {
			next();
			return;
		}
		
		// Check if user has role apiConsumer for the tenant of the API
		if (isTenantOk(response.tenantId, context.req.apiConsumerTenants)) {
			next();
		} else {
			var error = new Error();
			error.status = 404;
			error.message = 'Unknown "api" id "' + response.id + '".';
			error.code = 'MODEL_NOT_FOUND';
			error.stack = "";
			next(error);
		}
	 });

	// PUT /apis/{id} and  POST /apis/{id}/replace
	Api.beforeRemote('replaceById', function(context, unused, next) {
		Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
			if (err) {
				console.log("ERROR");
				console.log(err);
				next(err);
			}
				
			if (isTenantOk(api.tenantId, context.req.apiOwnerTenants)) {
				next();
			} else {
				var error = new Error();
				error.status = 404;
				error.message = 'Unknown "api" id "' + context.req.params.id + '".';
				error.code = 'MODEL_NOT_FOUND';
				error.stack = "";
				next(error);
			}

		});
	});

	// DELETE /apis/{id}
	Api.beforeRemote('deleteById', function(context, unused, next){
		Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
			if (err) {
				console.log("ERROR");
				console.log(err);
				next(err);
			}

			if (api && isTenantOk(api.tenantId, context.req.apiOwnerTenants)) {
				next();
			} else {
				var error = new Error();
				error.status = 404;
				error.message = 'Unknown "api" id "' + context.req.params.id + '".';
				error.code = 'MODEL_NOT_FOUND';
				error.stack = "";
				next(error);
			}

		});
	});

	// GET /apis/{id}/clients
	Api.afterRemote('prototype.__get__clients', function(context, response, next) {
		// TODO!!
		// maybe beforeRemote() instead....
		next();
	});

	// DELETE /apis/{id}/clients
	Api.beforeRemote('prototype.__delete__clients', function(context, response, next) {
		// TODO!!
		next();
	});

	function isTenantOk(tenantId, tenants) {
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
};
