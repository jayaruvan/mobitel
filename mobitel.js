"use strict";
//mobitel.js
//*****************************************************************************
//
//	Description		: Implementation of Mobitel (Srilanka) SMs gateway
//	Author		  	: Jayaruvan Dissanayake
//	Date		    : 2023-05-20
//
//*****************************************************************************
const soap = require("soap");
const config = require("config");
const smsConfig = config.get("sms");
const log = require("loggerj");
global.sms_session_check = null;
global.sms_session = null;
/* Log only at error */
//Create SMS gateway SOAP clietnt

//lets create only one client per service
async function getClient() {
	let result = await new Promise(async (resolve) => {
		if (!global.smsClient) {
			global.smsClient = await createClient();
			resolve(smsClient);
		} else {
			resolve(smsClient);
		}
	}).then((result) => {
		return result;
	});
	return result;
}
async function createClient() {
	let result = await new Promise(async (resolve) => {
		const url = smsConfig.wsdl;

		soap.createClient(url, function (err, client) {
			if (err) {
				log.error(err);
				resolve(null);
			} else {
				resolve(client);
			}
		});
	}).then((result) => {
		return result;
	});
	return result;
}

async function serviceTest() {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("serviceTest -> Error  | client = NULL ");
			resolve(null);
		} else {
			const tns_user = {
				user: {
					customer: null,
					id: null,
					password: smsConfig.credentials.password,
					username: smsConfig.credentials.username,
				},
			};
			soap_client.serviceTest(tns_user, function (err, session) {
				if (err) {
					log.erroror(err);
					resolve(null);
				} else {
					resolve(session);
				}
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}

async function getSession() {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("createSession -> Error  | client = NULL ");
		} else {
			const tns_user = {
				user: {
					customer: null,
					id: null,
					password: smsConfig.credentials.password,
					username: smsConfig.credentials.username,
				},
			};
			soap_client.createSession(tns_user, function (err, session) {
				if (err) {
					log.erroror("Error", err);
					resolve(null);
				} else {
					resolve(session);
				}
			});
		}
	}).then((result) => {
		//console.log("getSession ->", result);
		return result;
	});
	return result;
}

async function renewSession() {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("renewSession -> Error  | client = NULL ");
			resolve(null);
		} else {
			if (
				sms_session ||
				(sms_session.isActive && !sms_session.isActive)
			) {
				global.sms_session = await getSession();
			}
			const tns_session = {
				sessionId: sms_session.return.sessionId,
			};

			soap_client.renewSession(tns_session, function (err, session) {
				if (err) {
					log.erroror(err);
					//global.sms_session=null;
					resolve(null);
				} else {
					//global.sms_session=session;
					resolve(session);
				}
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}

async function closeSession(session = null) {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("renewSession -> Error  | client = NULL ");
			resolve(null);
		} else {
			let tns_session = null;
			if (sms_session && sms_sessionr.eturn.sessionId) {
				tns_session = {
					sessionId: sms_session.return.sessionId,
				};
			}

			if (session) {
				tns_session = {
					sessionId: session.return.sessionId,
				};
			}

			soap_client.closeSession(tns_session, function (err, session) {
				if (err) {
					log.erroror(err);
					//global.sms_session=null;
					resolve(null);
				} else {
					//global.sms_session=session;
					resolve(session);
				}
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}

async function isSession() {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("renewSession -> Error  | client = NULL ");
			resolve(null);
		} else {
			const tns_session = {
				sessionId: sms_session.return.sessionId,
			};

			soap_client.isSession(tns_session, function (err, session) {
				if (err) {
					log.erroror(err);
					//global.sms_session=null;
					resolve(null);
				} else {
					//global.sms_session=session;
					resolve(session);
				}
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}
// priority => For high priority messages insert value 1 whereas 2 or 3 for
// other messages based on the customer requirement
//messageType => For Promotional message type the value is 1 whereas 0
//if for normal messages type

async function sendMessage(
	number,
	message,
	sender = smsConfig.sender,
	messagetype = smsConfig.messagetype,
	priority = smsConfig.priority
) {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error(
				"sendMessages -> Error  | client = NULL |  No Connectivity "
			);

			resolve(null);
		} else {
			await sessionExpiryDateCheck().then(() => {
				const parameters = {
					session: {
						sessionId: sms_session.return.sessionId,
					},
					smsMessage: {
						sender: sender,
						message: message,
						recipients: number,
						messageType: messagetype,
						priority: priority,
					},
				};

				soap_client.sendMessages(parameters, function (err, status) {
					if (err) {
						log.erroror(err);
						//global.sms_session=null;
						resolve(null);
					} else {
						// global.sms_session=session;
						log.info({
							mobile: number,
							text: message,
							status: status,
							session: sms_session.return.sessionId,
						});
						resolve(status);
					}
				});
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}
async function sendMessagePerSession(
	number,
	message,
	sender = smsConfig.sender,
	messagetype = smsConfig.messagetype,
	priority = smsConfig.priority
) {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error(
				"sendMessages -> Error  | client = NULL |  No Connectivity "
			);
			resolve(null);
		} else {
			await getSession().then((new_session) => {
				const parameters = {
					session: {
						sessionId: new_session.return.sessionId,
					},
					smsMessage: {
						sender: sender,
						message: message,
						recipients: number,
						messageType: messagetype,
						priority: priority,
					},
				};

				soap_client.sendMessages(
					parameters,
					async function (err, status) {
						if (err) {
							log.erroror(err);
							//global.sms_session=null;
							await closeSession(new_session);
							resolve(null);
						} else {
							// global.sms_session=session;
							//console.log(status);

							const code = !status
								? JSON.parse(status.return)
								: status;
							const responce_status = {
								code: code,
								sessionId: new_session.return.sessionId,
							};
							//console.log(responce_status);

							log.info({
								mobile: number,
								text: message,
								status: responce_status,
							});
							await closeSession(new_session);

							resolve(responce_status);
						}
					}
				);
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}
async function getDeliveryReportsPerSession(
	sessionId,
	alias = smsConfig.sender
) {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error(
				"getDeliveryReportsPerSession -> Error  | client = NULL "
			);
			resolve(null);
		} else {
			const parameters = {
				session: {
					sessionId: sessionId,
				},
				alias: alias,
			};

			soap_client.getDeliveryReports(parameters, function (err, session) {
				if (err) {
					log.error(err);
					resolve(null);
				} else {
					log.debug(session);
					resolve(session);
				}
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}
async function getSentMessageReports(
	startDate,
	endDate,
	alias = smsConfig.sender
) {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("getSentMessageReports -> Error  | client = NULL ");
			resolve(null);
		} else {
			const parameters = {
				session: {
					sessionId: sms_session.return.sessionId,
				},
				startDate: startDate,
				endDate: endDate,
				alias: alias,
			};

			soap_client.getSentMessageReports(
				parameters,
				function (err, session) {
					if (err) {
						log.erroror(err);

						resolve(null);
					} else {
						resolve(session);
					}
				}
			);
		}
	}).then((result) => {
		return result;
	});
	return result;
}
async function getDeliveryReports(
	startDate,
	endDate,
	alias = smsConfig.sender
) {
	let result = await new Promise(async (resolve) => {
		let soap_client = await getClient();
		if (!soap_client) {
			log.error("getDeliveryReports -> Error  | client = NULL ");
			resolve(null);
		} else {
			const parameters = {
				session: {
					sessionId: sms_session.return.sessionId,
				},

				alias: alias,
			};

			soap_client.getDeliveryReports(parameters, function (err, session) {
				if (err) {
					log.erroror(err);
					resolve(null);
				} else {
					resolve(session);
				}
			});
		}
	}).then((result) => {
		return result;
	});
	return result;
}
async function sessionExpiryDateCheck() {
	let result = await new Promise(async (resolve) => {
		/*
		if (sms_session && sms_session.isActive && !sms_session.isActive) {
			global.sms_session = await getSession();
			global.sms_session_check = true;
			resolve(true);
		}
*/
		// <expiryDate>2023-03-10T22:17:43+05:30</expiryDate> verify
		if (sms_session && sms_session.expiryDate) {
			var now = new Date();
			var sessionTimeStamp = new Date(sms_session.expiryDate);
			let diffInMinitues =
				(sessionTimeStamp.getTime() - now.getTime()) / (1000 * 60);

			log.debug(
				"sessionExpiryDateCheck>diffInMinitues = ",
				diffInMinitues
			);
			if (diffInMinitues < smsConfig.sessionOverlapInMin) {
				global.sms_session = await getSession();
				global.sms_session_check = true;
				resolve(true);
			}
		}
		if (!sms_session) {
			global.sms_session = await getSession();
			global.sms_session_check = true;
			resolve(true);
		}
	}).then((result) => {
		return result;
	});
	return result;
}
setInterval(function () {
	if (sms_session_check) {
		sessionExpiryDateCheck();
	}
}, smsConfig.smsSessionRecheckIntervalInMins);

module.exports = {
	serviceTest,
	sendMessage,
	getSentMessageReports,
	getDeliveryReports,
	getSession,
	sendMessagePerSession,
	getDeliveryReportsPerSession,
};
