'use strict';

module.exports = function(Client) {
	
	var uuid = require('node-uuid');

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


	/**************************
	*	Remote Hooks
	***************************/
	/* NEEDS TO BE CLARIFY: what is necessary here and what is not */
	
};
