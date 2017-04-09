'use strict';

import clone from 'clone';
import deepmerge from 'deepmerge';
import Logger from './Logger';

import storage from './storage';

const logger = new Logger('settingsManager');

const DEFAULT_SIP_DOMAIN = 'tryit.jssip.net';
const DEFAULT_SETTINGS =
{
	display_name        : 'sip1002',
	uri                 : 'sip:1002@59.111.96.125',
	password            : 'sevenfish.1234',
	socket              :
	{
		uri           : 'ws://59.111.96.125:5066',
		via_transport : 'auto',
	},
	registrar_server    : null,
	contact_uri         : null,
	authorization_user  : null,
	instance_id         : null,
	session_timers      : false,
	use_preloaded_route : false,
	pcConfig            :
	{
		rtcpMuxPolicy : 'negotiate',
		iceServers    :
		[
			{ urls : [ 'stun:stun.l.google.com:19302' ] }
		]
	},
	callstats           :
	{
		enabled   : false,
		AppID     : null,
		AppSecret : null
	}
};

let settings;

// First, read settings from local storage
settings = storage.get();

if (settings)
	logger.debug('settings found in local storage');

// Try to read settings from a global SETTINGS object
if (window.SETTINGS)
{
	logger.debug('window.SETTINGS found');

	settings = deepmerge(window.SETTINGS, settings || {}, true);
}

// If not settings are found, clone default ones
if (!settings)
{
	logger.debug('no settings found, using default ones');

	settings = clone(DEFAULT_SETTINGS, false);
}

module.exports =
{
	get()
	{
		return settings;
	},

	set(newSettings)
	{
		storage.set(newSettings);
		settings = newSettings;
	},

	clear()
	{
		storage.clear();
		settings = clone(DEFAULT_SETTINGS, false);
	},

	isReady()
	{
		return !!storage.get();
	},

	getDefaultDomain()
	{
		return DEFAULT_SIP_DOMAIN;
	}
};
