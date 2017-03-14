'use strict';

module.exports = function(Api) {
	var uuid = require('node-uuid');

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

	// Disable some relational functions 
	Api.disableRemoteMethodByName('prototype.__create__clients');		// POST		/apis/:id/clients
	Api.disableRemoteMethodByName('prototype.__findById__clients');		// GET		/apis/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__updateById__clients');	// PUT		/apis/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__destroyById__clients');	// DELETE	/apis/:id/clients/:clientId
	Api.disableRemoteMethodByName('prototype.__count__clients');		// GET 		/apis/:id/clients/count
	Api.disableRemoteMethodByName('prototype.__link__clients');
	Api.disableRemoteMethodByName('prototype.__unlink__clients');

	// GET /apis
	Api.beforeRemote('find', function(context, unused, next) {
	    if (!context.args.filter || !context.args.filter.where) {
	    	// No 'where' filter in request, add where clause to check audience
	    	context.args.filter = {where: { audience: { inq: context.req.apiConsumerTenants}}};
	    } else {
	    	// 'where' clause in request, add AND clause to check audience
	    	context.args.filter.where = {and: [{audience: { inq: context.req.apiConsumerTenants}}, context.args.filter.where] };
	    }
	    next();
	 });

	// POST /apis
	Api.beforeRemote('create', function(context, unused, next) {
		// Check that tenantId from body matches one tenant from apiOwner Role from token
		if (isTenantInArray(context.req.body.tenantId, context.req.apiOwnerTenants)) {
			var newId = uuid.v4();
			context.req.body.id = newId;
			next();
		} else {
			var error = new Error();
			error.status = 400;
			error.message = 'Wrong tenantId in request body.';
			error.code = 'BAD_REQUEST';
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
		
		// Check if user has role apiConsumer for the audience of the API
		if (checkAudience(response.audience, context.req.apiConsumerTenants)) {
			console.log("ok");
			next();
		} else {
			console.log("nok");
			var error = new Error();
			error.status = 404;
			error.message = 'Unknown "api" id "' + response.id + '".';
			error.code = 'MODEL_NOT_FOUND';
			next(error);
		}
	 });

	// PUT /apis/{id} and  POST /apis/{id}/replace
	/*Api.beforeRemote('replaceById', function(context, unused, next) {
		Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
			if (err) {
				console.log("ERROR");
				console.log(err);
				next(err);
			}
				
			if (isTenantInArray(api.tenantId, context.req.apiOwnerTenants)) {
				next();
			} else {
				var error = new Error();
				error.status = 404;
				error.message = 'Unknown "api" id "' + context.req.params.id + '".';
				error.code = 'MODEL_NOT_FOUND';
				next(error);
			}

		});
	});*/

	// DELETE /apis/{id}
	Api.beforeRemote('deleteById', function(context, unused, next){
		Api.findById(context.req.params.id, { fields: {tenantId: true} }, function(err, api) {
			if (err) {
				console.log("ERROR");
				console.log(err);
				next(err);
			}

			if (api && isTenantInArray(api.tenantId, context.req.apiOwnerTenants)) {
				next();
			} else {
				var error = new Error();
				error.status = 404;
				error.message = 'Unknown "api" id "' + context.req.params.id + '".';
				error.code = 'MODEL_NOT_FOUND';
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

	function checkAudience(audience, apiConsumers) {
		// NOTE: array.indexOf() doesn't seem to work with mongodb generated ids....
		return apiConsumers.some(function (v) {
        	return audience.indexOf(v) >= 0;
    	});
	}
};
