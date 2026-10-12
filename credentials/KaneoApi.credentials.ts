import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class KaneoApi implements ICredentialType {
	name = 'kaneoApi';

	displayName = 'Kaneo API';

	icon: Icon = {
		light: 'file:../nodes/Kaneo/kaneo.svg',
		dark: 'file:../nodes/Kaneo/kaneo.dark.svg',
	};

	documentationUrl = 'https://kaneo.app/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Kaneo API key or session token. Sent as the <code>Authorization: Bearer</code> header.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://cloud.kaneo.app',
			required: true,
			description:
				'Origin of the Kaneo instance. Use https://cloud.kaneo.app for cloud or your self-hosted origin (e.g. https://kaneo.example.com). A trailing <code>/api</code> is tolerated.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/api\\/?$/, "").replace(/\\/+$/, "")}}/api',
			url: '/user/me',
			method: 'GET',
		},
	};
}
