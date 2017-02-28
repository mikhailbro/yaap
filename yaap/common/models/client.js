'use strict';

module.exports = function(Client) {

	// Disable some functions via REST API according to http://loopback.io/doc/en/lb3/Exposing-models-over-REST.html
	Client.disableRemoteMethodByName('exists'); 					// GET		/resource/:id/exists
	Client.disableRemoteMethodByName('findOne');					// GET		/resource/findOne
	Client.disableRemoteMethodByName('count');						// GET 		/resource/count
	Client.disableRemoteMethodByName('createChangeStream');			// POST		/resource/change-stream
	Client.disableRemoteMethodByName('patchOrCreate');				// PATCH	/resource
	Client.disableRemoteMethodByName('replaceOrCreate');			// PUT		/resource
	Client.disableRemoteMethodByName('prototype.patchAttributes');	// PATCH	/resource/:id
	Client.disableRemoteMethodByName('updateAll');					// POST		/resource/update
	Client.disableRemoteMethodByName('upsertWithWhere');			// POST		/resource/upsertWithWhere
};
