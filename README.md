# Kaneo n8n Node

n8n community node for [Kaneo](https://kaneo.app) project management. Manage projects, tasks, board columns, labels, comments, time entries, custom fields, relations, workspaces, search, notifications, and instance info.

Works with Kaneo Cloud (`https://cloud.kaneo.app`) and self-hosted instances. No runtime dependencies. Follows the [Kaneo OpenAPI spec](https://kaneo.app/docs/openapi.json).

## Installation

In n8n (**Settings → Community Nodes → Install**):

```
n8n-nodes-kaneo
```

## Credentials

Create a **Kaneo API** credential:

- **API Key**: from your Kaneo workspace (API key or session token, sent as `Authorization: Bearer <key>`).
- **Base URL**: `https://cloud.kaneo.app` for cloud, or your self-hosted origin (e.g. `https://kaneo.example.com`, optionally with a port like `http://192.168.1.10:3000`). The API is served under the `/api` path on both cloud and self-hosted instances; a trailing `/api` in this field is tolerated.

Credential test calls `GET {base}/api/user/me`, which works on cloud and self-hosted alike.

## Pickers and public endpoints

- **Workspace** and **Project** fields offer a searchable **From List** dropdown (loaded live from your instance) with a **By ID** fallback for IDs pasted from elsewhere. Existing workflows that store plain IDs keep working unchanged.
- **System** operations (`Get Config`, `Get Instance Status`) and **Project > Get Public Board** are public endpoints: only the credential's Base URL is used and no API key is sent. The node shows an in-app notice where this applies.

## Operations

- **Project**: list, get, create, update, delete, archive, unarchive, move, reorder, get public board.
- **Task**: board list, get, get by ticket ID (e.g. `KAN-12`), create, full update, field updates (title/status/priority/due date/assignee/description), delete, duplicate, move, bulk update, reorder, export, import.
- **Column**: list, create, update, delete, reorder.
- **Label**: list (workspace/task), get, create, update, delete, attach, detach. Large workspace deletes may return `202` — repeat until `200`.
- **Comment**: list, create, update, delete.
- **Activity**: task feed, workspace feed, legacy comment create/update/delete, event create.
- **Time Entry**: list by task, get, create, update (set `endTime` to close a running timer).
- **Workspace**: list, get, members, capabilities, my project access.
- **Search**: global search, my assigned tasks, description matches.
- **Custom Field**: create definition, list definitions, task values, project values, set value.
- **Task Relation**: list, create (subtask/blocks/related), delete.
- **User**: get current user.
- **Notification**: list, create, mark read, mark all read, clear all.
- **System**: instance config (public), instance status (public).

## License

MIT — see [LICENSE](LICENSE).
