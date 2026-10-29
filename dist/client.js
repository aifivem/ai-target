/*aicore-client-errors*/(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\^\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("ai-core:clientError",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();
try{
(function() {

// ../../../packages/lib/src/fivem/callbackNames.ts
	const responseEvent = (resource) => `aicore:cbr:${resource}`;

// ../../../packages/lib/src/shared/wait.ts
/** Resolves after `ms` milliseconds. */
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

// ../../../packages/lib/src/shared/index.ts
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
	function formatText(template, args) {
		return template.replace(/\{(\d+)\}/g, (match, index) => {
			const value = args[Number(index)];
			return value === void 0 ? match : String(value);
		});
	}
	/** Console output prefixed with the resource name, so server logs show where a line came from. */
	function createLogger(resource) {
		const prefix = `[${resource}]`;
		return {
			info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
			warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
			error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
		};
	}

// ../../../packages/lib/src/client/netEvent.ts
	const log$6 = createLogger(GetCurrentResourceName());
	/**
	* Whether the net event being handled came from the server (read it before the first `await`). On a client only
	* events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
	*/
	const fromServer = () => Boolean(globalThis.source);
	function onServerEvent(name, first, second) {
		const [handler, parse] = typeof first === "function" ? [first, null] : [second, first.args];
		onNet(name, (...raw) => {
			if (!fromServer() || !handler) return;
			const args = parse ? parse(raw) : [];
			if (!args) return log$6.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$6.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource = GetCurrentResourceName();
	const log$5 = createLogger(resource);
	const pending = /* @__PURE__ */ new Map();
	onNet(responseEvent(resource), (id, ok, result) => {
		if (!fromServer()) return;
		const entry = typeof id === "number" ? pending.get(id) : void 0;
		if (!entry) return;
		pending.delete(id);
		clearTimeout(entry.timer);
		if (ok === true) entry.resolve(result);
		else entry.reject(/* @__PURE__ */ new Error("server callback failed"));
	});

// ../../../packages/shared/src/core.ts
/** Names owned by ai-core that other resources, the bridges and the build step use. */
	const CORE = {
		resource: "ai-core",
		/** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
		clientErrorEvent: "ai-core:clientError",
		/** (src, character: CharacterInfo) after a character is loaded and spawned. */
		playerLoadedEvent: "ai-core:playerLoaded",
		/** (src, charId, reason: UnloadReason) before a character's state is dropped. */
		playerUnloadedEvent: "ai-core:playerUnloaded",
		/** (src, account: string, balance: number, delta: number, reason: string) */
		moneyChangedEvent: "ai-core:moneyChanged",
		/** (src, jobs: JobMembership[]) */
		jobsChangedEvent: "ai-core:jobsChanged",
		/** (src, job: string | null) */
		dutyChangedEvent: "ai-core:dutyChanged",
		/** (src, gangs: GangMembership[]) */
		gangsChangedEvent: "ai-core:gangsChanged",
		/** (src, gang: string | null) */
		activeGangChangedEvent: "ai-core:activeGangChanged",
		/** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
		characterScreenEvent: "ai-core:characterScreen",
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};

// ../../../packages/lib/src/client/cache.ts
/** The unarmed "weapon" hash: cached as `false`. */
	const UNARMED = GetHashKey("WEAPON_UNARMED") | 0;
	/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
	function readPlayerState(ped) {
		const vehicle = GetVehiclePedIsIn(ped, false);
		let seat = false;
		if (vehicle) for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
			if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
			seat = i;
			break;
		}
		const weapon = GetSelectedPedWeapon(ped) | 0;
		return {
			vehicle: vehicle || false,
			seat,
			weapon: weapon === UNARMED ? false : weapon
		};
	}
	/**
	* The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
	* read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
	* a local event, so no resource polls for these itself. Read only.
	*/
	const ped = PlayerPedId();
	const cache = {
		ped,
		playerId: PlayerId(),
		serverId: GetPlayerServerId(PlayerId()),
		...readPlayerState(ped)
	};
	const handlers$1 = /* @__PURE__ */ new Map();
	const valid = (key, value) => key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;
	on(CORE.clientCacheEvent, (key, value) => {
		if (typeof key !== "string" || !(key in cache)) return;
		const name = key;
		if (!valid(name, value) || cache[name] === value) return;
		const old = cache[name];
		cache[name] = value;
		for (const handler of handlers$1.get(name) ?? []) handler(value, old);
	});

// ../../../packages/lib/src/client/zones.ts
/**
	* Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
	* (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
	* the zones the player is in.
	*/
	const log$4 = createLogger(GetCurrentResourceName());

// ../../../packages/lib/src/fivem/exports.ts
	function registerExport(name, handler) {
		globalThis.exports(name, handler);
	}
	/** Answers `exports["<resource>"].<name>` for a resource name this one `provide`s: provide makes the name exist but does not alias its exports, so each export of the stood-in resource is answered through FiveM's export event. */
	function provideExport(resource, name, fn) {
		on(`__cfx_export_${resource}_${name}`, (setCallback) => setCallback(fn));
	}

// ../../../packages/lib/src/fivem/playerData.ts
/**
	* ai-core's per-player channel: the server pushes `(key, value)` of `AiPlayerData` to the owner's client. One net
	* event carries every key, and every resource on that client receives it, so client code subscribes per key
	* instead of wiring its own `onNet` for each value.
	*/
	const PLAYER_DATA_EVENT = "ai-core:client:playerData";
	/** Same channel for map values (money): only the changed entries travel and the client merges them. */
	const PLAYER_DATA_PATCH_EVENT = "ai-core:client:playerDataPatch";

// ../../../packages/lib/src/client/playerData.ts
	const values = /* @__PURE__ */ new Map();
	const handlers = /* @__PURE__ */ new Map();
	let listening = false;
	function deliver(key, value) {
		values.set(key, value);
		for (const handler of handlers.get(key) ?? []) handler(value);
	}
	function listen() {
		if (listening) return;
		listening = true;
		onServerEvent(PLAYER_DATA_EVENT, { args: ([key, value]) => typeof key === "string" ? [key, value] : null }, (key, value) => deliver(key, value));
		onServerEvent(PLAYER_DATA_PATCH_EVENT, { args: ([key, patch]) => typeof key === "string" && isRecord(patch) ? [key, patch] : null }, (key, patch) => {
			const current = values.get(key);
			deliver(key, {
				...isRecord(current) ? current : {},
				...patch
			});
		});
	}
	/** The last value pushed since this resource started, or undefined. */
	function getPlayerData(key) {
		listen();
		return values.get(key);
	}

// ../../../packages/lib/src/fivem/locale.ts
/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
	const LOCALE_CONVAR = "ai:locale";
	function readLocaleFile(resource, lang) {
		const raw = LoadResourceFile(resource, `locales/${lang}.json`);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const texts = {};
		for (const [key, value] of Object.entries(parsed)) if (typeof value === "string") texts[key] = value;
		return texts;
	}
	/**
	* The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
	* `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
	* `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
	*
	*   const t = createLocale<typeof import("../../locales/en.json")>();
	*   t("NOTIFY_NO_MONEY", price);
	*/
	function createLocale() {
		const texts = loadLocaleTexts();
		return (key, ...args) => formatText(texts[key] ?? key, args);
	}
	/**
	* The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
	* resolved). A NUI gets this once and fills `{0}` placeholders itself.
	*/
	function loadLocaleTexts(resource = GetCurrentResourceName()) {
		const lang = GetConvar(LOCALE_CONVAR, "en");
		const texts = {
			...readLocaleFile(resource, "en"),
			...lang === "en" ? {} : readLocaleFile(resource, lang)
		};
		for (const key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
		return texts;
	}

// ../../../packages/lib/src/client/index.ts
/** Client-only helpers. Import from "@aicore-fivem/lib/client". */
	/** A per-frame job that can be switched on and off without leaking ticks (an idle tick still costs time). */
	var TickLoop = class {
		onFrame;
		id = null;
		constructor(onFrame) {
			this.onFrame = onFrame;
		}
		get running() {
			return this.id !== null;
		}
		set(active) {
			if (active && this.id === null) this.id = setTick(this.onFrame);
			else if (!active && this.id !== null) {
				clearTick(this.id);
				this.id = null;
			}
		}
	};

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/options.ts
	const str = (value, max = 64) => typeof value === "string" && value.length > 0 ? value.slice(0, max) : void 0;
	const fn = (value) => typeof value === "function" ? value : void 0;
	function toGroups(value) {
		if (typeof value === "string") return value;
		if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
		if (!isRecord(value)) return void 0;
		const out = {};
		for (const [name, grade] of Object.entries(value)) if (typeof grade === "number") out[name] = grade;
		return out;
	}
	function toOption(value, resource) {
		if (!isRecord(value)) return null;
		const label = str(value.label, 80);
		if (!label) return null;
		return {
			name: str(value.name) ?? label,
			label,
			icon: str(value.icon),
			distance: typeof value.distance === "number" && value.distance > 0 ? Math.min(value.distance, 50) : void 0,
			groups: toGroups(value.groups),
			canInteract: fn(value.canInteract),
			onSelect: fn(value.onSelect),
			export: str(value.export, 128),
			event: str(value.event, 128),
			serverEvent: str(value.serverEvent, 128),
			command: str(value.command, 128),
			resource
		};
	}
	/** One option or a list of them; invalid ones (no label) are left out. */
	function toOptions(value, resource) {
		const list = Array.isArray(value) ? value : [value];
		const out = [];
		for (const item of list) {
			const option = toOption(item, resource);
			if (option) out.push(option);
		}
		return out;
	}
	/** Option names for a removal: one name, a list, or none (= every option). */
	function toNames(value) {
		if (typeof value === "string") return /* @__PURE__ */ new Set([value]);
		if (Array.isArray(value)) return new Set(value.filter((v) => typeof v === "string"));
		return null;
	}
	const DEFAULT_REACH = 2.5;
	const reachOf = (option) => option.distance ?? 2.5;

// resource/client/zones.ts
	const CELL = 64;
	const cellKey = (cx, cy) => cx + 32768 << 16 | cy + 32768;
	/** Centre and bounding radius of a shape on the ground plane. */
	function circle(shape) {
		if (shape.type === "sphere") return [
			shape.center.x,
			shape.center.y,
			shape.radius
		];
		if (shape.type === "box") return [
			shape.center.x,
			shape.center.y,
			Math.hypot(shape.size.x, shape.size.y) / 2
		];
		let sx = 0;
		let sy = 0;
		for (const p of shape.points) {
			sx += p.x;
			sy += p.y;
		}
		const cx = sx / shape.points.length;
		const cy = sy / shape.points.length;
		let r = 0;
		for (const p of shape.points) r = Math.max(r, Math.hypot(p.x - cx, p.y - cy));
		return [
			cx,
			cy,
			r
		];
	}
	/** Bottom and top height of a shape. */
	function heights(shape) {
		if (shape.type === "sphere") return [shape.center.z - shape.radius, shape.center.z + shape.radius];
		if (shape.type === "box") return [shape.center.z - shape.size.z / 2, shape.center.z + shape.size.z / 2];
		return [shape.minZ, shape.maxZ];
	}
	/**
	* Where a zone's marker stands: its centre; in a tall zone at the player's height (kept inside the zone), so a
	* 20 m tall shop box does not draw its marker on the roof.
	*/
	function zoneAnchor(zone, playerZ) {
		const [bottom, top] = heights(zone.shape);
		const z = top - bottom > 4 ? Math.min(top - .5, Math.max(bottom + .5, playerZ)) : (bottom + top) / 2;
		return {
			x: zone.cx,
			y: zone.cy,
			z
		};
	}
	var TargetZones = class {
		byId = /* @__PURE__ */ new Map();
		byName = /* @__PURE__ */ new Map();
		grid = /* @__PURE__ */ new Map();
		nextId = 1;
		add(shape, options, resource, name) {
			if (name && this.byName.has(name)) this.remove(this.byName.get(name));
			const [cx, cy, reach] = circle(shape);
			const zone = {
				id: this.nextId++,
				name,
				resource,
				shape,
				options,
				cx,
				cy,
				reach,
				cells: []
			};
			const x0 = Math.floor((cx - reach) / CELL);
			const x1 = Math.floor((cx + reach) / CELL);
			const y0 = Math.floor((cy - reach) / CELL);
			const y1 = Math.floor((cy + reach) / CELL);
			for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
				const key = cellKey(x, y);
				const cell = this.grid.get(key);
				if (cell) cell.push(zone);
				else this.grid.set(key, [zone]);
				zone.cells.push(key);
			}
			this.byId.set(zone.id, zone);
			if (name) this.byName.set(name, zone.id);
			return zone.id;
		}
		remove(id) {
			const zone = this.byId.get(id);
			if (!zone) return false;
			this.byId.delete(id);
			if (zone.name && this.byName.get(zone.name) === id) this.byName.delete(zone.name);
			for (const key of zone.cells) {
				const cell = this.grid.get(key);
				if (!cell) continue;
				const index = cell.indexOf(zone);
				if (index >= 0) cell.splice(index, 1);
				if (cell.length === 0) this.grid.delete(key);
			}
			return true;
		}
		removeNamed(name) {
			const id = this.byName.get(name);
			return id !== void 0 && this.remove(id);
		}
		exists(id) {
			return typeof id === "number" ? this.byId.has(id) : this.byName.has(id);
		}
		removeResource(resource) {
			for (const zone of this.byId.values()) if (zone.resource === resource) this.remove(zone.id);
		}
		/** Zones whose bounding circle comes within `range` metres of (x, y); each zone once. */
		near(x, y, range, out) {
			out.length = 0;
			const x0 = Math.floor((x - range) / CELL);
			const x1 = Math.floor((x + range) / CELL);
			const y0 = Math.floor((y - range) / CELL);
			const y1 = Math.floor((y + range) / CELL);
			for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
				const cell = this.grid.get(cellKey(cx, cy));
				if (!cell) continue;
				for (const zone of cell) {
					if (Math.hypot(zone.cx - x, zone.cy - y) > zone.reach + range || out.includes(zone)) continue;
					out.push(zone);
				}
			}
		}
		get size() {
			return this.byId.size;
		}
	};

// resource/client/registry.ts
/** The list without the options named in `names` (empty when `names` is null: every option goes). */
	function without(list, names) {
		return names ? list.filter((option) => !names.has(option.name)) : [];
	}
	/** Puts options on a key of a map, or takes named ones off it (the key goes when nothing is left). */
	var OptionMap = class {
		map = /* @__PURE__ */ new Map();
		add(key, options) {
			const current = this.map.get(key);
			if (!current) return void this.map.set(key, [...options]);
			const names = new Set(options.map((o) => `${o.resource}:${o.name}`));
			this.map.set(key, [...current.filter((o) => !names.has(`${o.resource}:${o.name}`)), ...options]);
		}
		remove(key, names) {
			const current = this.map.get(key);
			if (!current) return;
			const left = without(current, names);
			if (left.length) this.map.set(key, left);
			else this.map.delete(key);
		}
		removeResource(resource) {
			for (const [key, list] of this.map) {
				const left = list.filter((option) => option.resource !== resource);
				if (left.length === list.length) continue;
				if (left.length) this.map.set(key, left);
				else this.map.delete(key);
			}
		}
	};
	/**
	* Every option registered on this client, by what it hangs on: zones (grid), models, networked entities (net id),
	* local entities (handle) and global kinds. Lookups by key are O(1); a resource's options go when it stops.
	*/
	var Registry = class {
		zones = new TargetZones();
		models = new OptionMap();
		netEntities = new OptionMap();
		localEntities = new OptionMap();
		globals = {
			ped: [],
			vehicle: [],
			object: [],
			player: []
		};
		/** Changes when the set of models with options changes, so the scanner knows which pools to walk. */
		modelsVersion = 0;
		addGlobal(kind, options) {
			const names = new Set(options.map((o) => `${o.resource}:${o.name}`));
			this.globals[kind] = [...this.globals[kind].filter((o) => !names.has(`${o.resource}:${o.name}`)), ...options];
		}
		removeGlobal(kind, names) {
			this.globals[kind] = without(this.globals[kind], names);
		}
		addModels(models, options) {
			for (const model of models) this.models.add(model, options);
			this.modelsVersion++;
		}
		removeModels(models, names) {
			for (const model of models) this.models.remove(model, names);
			this.modelsVersion++;
		}
		removeResource(resource) {
			this.zones.removeResource(resource);
			this.models.removeResource(resource);
			this.netEntities.removeResource(resource);
			this.localEntities.removeResource(resource);
			for (const kind of Object.keys(this.globals)) this.globals[kind] = this.globals[kind].filter((o) => o.resource !== resource);
			this.modelsVersion++;
		}
	};
	const registry = new Registry();

// resource/client/api.ts
	const log$3 = createLogger(ResourceName);
	const caller = () => GetInvokingResource() || ResourceName;
	/** A vector from another resource: a Lua vector3 arrives as an array, a table as an object. */
	function toVec3(value) {
		if (Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every((n) => typeof n === "number")) return {
			x: value[0],
			y: value[1],
			z: value[2]
		};
		if (isRecord(value) && typeof value.x === "number" && typeof value.y === "number" && typeof value.z === "number") return {
			x: value.x,
			y: value.y,
			z: value.z
		};
		return null;
	}
	const list = (value, read) => (Array.isArray(value) ? value : [value]).map(read).filter((v) => v !== null);
	const toModel = (value) => typeof value === "number" ? value >>> 0 : typeof value === "string" ? GetHashKey(value) >>> 0 : null;
	const toHandle = (value) => typeof value === "number" && Number.isInteger(value) ? value : null;
	function addZone(type, data) {
		if (!isRecord(data)) return 0;
		const name = typeof data.name === "string" ? data.name : void 0;
		let shape = null;
		if (type === "sphere") {
			const center = toVec3(data.coords);
			if (center) shape = {
				type,
				center,
				radius: typeof data.radius === "number" ? data.radius : 2
			};
		} else if (type === "box") {
			const center = toVec3(data.coords);
			if (center) shape = {
				type,
				center,
				size: toVec3(data.size) ?? {
					x: 2,
					y: 2,
					z: 2
				},
				rotation: typeof data.rotation === "number" ? data.rotation : 0
			};
		} else {
			const points = list(data.points, toVec3);
			const thickness = typeof data.thickness === "number" ? data.thickness : 4;
			if (points.length >= 3) {
				const z = points.reduce((sum, p) => sum + p.z, 0) / points.length;
				shape = {
					type,
					points,
					minZ: z - thickness / 2,
					maxZ: z + thickness / 2
				};
			}
		}
		if (!shape) {
			log$3.warn(`${caller()} sent a ${type} zone without valid coordinates`);
			return 0;
		}
		return registry.zones.add(shape, toOptions(data.options, caller()), caller(), name);
	}
	/**
	* The ox_target API, answered under this resource's name and under `ox_target` (the manifest provides it), so
	* scripts written for ox_target work unchanged.
	*/
	function registerApi(scanner) {
		const api = {
			addSphereZone: (data) => addZone("sphere", data),
			addBoxZone: (data) => addZone("box", data),
			addPolyZone: (data) => addZone("poly", data),
			removeZone: (id) => {
				if (typeof id === "string") registry.zones.removeNamed(id);
				else if (typeof id === "number") registry.zones.remove(id);
			},
			zoneExists: (id) => typeof id === "number" || typeof id === "string" ? registry.zones.exists(id) : false,
			addModel: (models, options) => registry.addModels(list(models, toModel), toOptions(options, caller())),
			removeModel: (models, names) => registry.removeModels(list(models, toModel), toNames(names)),
			addEntity: (netIds, options) => {
				for (const netId of list(netIds, toHandle)) registry.netEntities.add(netId, toOptions(options, caller()));
			},
			removeEntity: (netIds, names) => {
				for (const netId of list(netIds, toHandle)) registry.netEntities.remove(netId, toNames(names));
			},
			addLocalEntity: (entities, options) => {
				for (const entity of list(entities, toHandle)) registry.localEntities.add(entity, toOptions(options, caller()));
			},
			removeLocalEntity: (entities, names) => {
				for (const entity of list(entities, toHandle)) registry.localEntities.remove(entity, toNames(names));
			},
			addGlobalOption: () => log$3.warn(`${caller()} used addGlobalOption, which ai-target does not offer`),
			removeGlobalOption: () => void 0,
			disableTargeting: (state) => {
				scanner.disabled = state === true;
			},
			isActive: () => scanner.points.size > 0
		};
		for (const kind of [
			"Ped",
			"Vehicle",
			"Object",
			"Player"
		]) {
			const key = kind.toLowerCase();
			api[`addGlobal${kind}`] = (options) => registry.addGlobal(key, toOptions(options, caller()));
			api[`removeGlobal${kind}`] = (names) => registry.removeGlobal(key, toNames(names));
		}
		for (const [name, fn] of Object.entries(api)) {
			registerExport(name, fn);
			provideExport("ox_target", name, fn);
		}
		on("onClientResourceStop", (resource) => registry.removeResource(resource));
	}

// resource/common/nui.ts
/** Client -> NUI messages: `{ action, data }`. */
	const NuiMessage = {
		/** data: { points: TargetPoint[], key: string }, the markers (or the bound interaction key) changed; sent only on change. */
		points: "points",
		/** data: TargetCamera, sent while markers exist and the camera moved. */
		camera: "camera",
		/** data: { title, options: MenuOption[] }, several options: pick one. */
		openMenu: "openMenu",
		closeMenu: "closeMenu"
	};
	/** NUI -> client callbacks. */
	const NuiCallback = {
		/** (key | null) -> true, the marker in focus changed. */
		focus: "focus",
		/** (index) -> true, an option of the open menu was picked. */
		select: "select",
		/** () -> true, the menu was closed without a pick. */
		closeMenu: "closeMenu"
	};

// resource/client/actions.ts
	const log$2 = createLogger(ResourceName);
	/** What ox_target hands an option's handler: the option's plain fields plus where it was used. */
	function response(option, point, forServer) {
		let entity = point.entity;
		if (forServer) entity = entity !== 0 && NetworkGetEntityIsNetworked(entity) ? NetworkGetNetworkIdFromEntity(entity) : 0;
		const [px = 0, py = 0, pz = 0] = GetEntityCoords(cache.ped, false);
		return {
			name: option.name,
			label: option.label,
			entity,
			coords: [
				point.coords.x,
				point.coords.y,
				point.coords.z
			],
			distance: Math.hypot(point.coords.x - px, point.coords.y - py, point.coords.z - pz),
			zone: point.zone ?? void 0
		};
	}
	/** Runs an option the way ox_target does (onSelect, export, event, serverEvent, command); a failing one is logged. */
	function runOption(option, point) {
		try {
			if (option.onSelect) option.onSelect(response(option, point, false));
			else if (option.export) {
				const [resource = option.resource, name = option.export] = option.export.includes(".") ? option.export.split(".") : [option.resource, option.export];
				globalThis.exports[resource]?.[name]?.(null, response(option, point, false));
			} else if (option.event) emit(option.event, response(option, point, false));
			else if (option.serverEvent) emitNet(option.serverEvent, response(option, point, true));
			else if (option.command) ExecuteCommand(option.command);
		} catch (error) {
			log$2.error(`target option "${option.name}" from ${option.resource} failed`, error);
		}
	}

// resource/client/interaction.ts
/** GTA's own uses of E (INPUT_CONTEXT, INPUT_TALK, INPUT_VEH_HORN) stay off while a marker is focused. */
	const BLOCKED_CONTROLS = [
		38,
		51,
		86
	];
	/**
	* Focus and use: the overlay says which marker is in focus; ai-core's interaction key asks `HandleInteract` first
	* (one key for prompts and targets). One usable option runs at once, several open the pick menu.
	*/
	var Interaction = class {
		scanner;
		focus = null;
		menu = null;
		block = new TickLoop(() => {
			for (const control of BLOCKED_CONTROLS) DisableControlAction(0, control, true);
		});
		constructor(scanner) {
			this.scanner = scanner;
			RegisterNuiCallback(NuiCallback.focus, (key, cb) => {
				this.focus = typeof key === "string" ? key : null;
				this.block.set(this.focus !== null);
				cb(true);
			});
			RegisterNuiCallback(NuiCallback.select, (index, cb) => {
				const menu = this.menu;
				this.closeMenu();
				const option = typeof index === "number" ? menu?.options[index] : void 0;
				if (menu && option) runOption(option, menu.point);
				cb(true);
			});
			RegisterNuiCallback(NuiCallback.closeMenu, (_data, cb) => {
				this.closeMenu();
				cb(true);
			});
			registerExport("HandleInteract", () => this.interact());
		}
		/** The interaction key: true when a focused marker took it (ai-core then skips its prompts). */
		interact() {
			const point = this.focus ? this.scanner.points.get(this.focus) : void 0;
			if (!point || this.menu || point.usable.length === 0) return false;
			if (point.usable.length === 1) {
				runOption(point.usable[0], point);
				return true;
			}
			this.menu = {
				point,
				options: [...point.usable]
			};
			SetNuiFocus(true, true);
			SendNUIMessage({
				action: NuiMessage.openMenu,
				data: {
					title: point.visible[0]?.label ?? "",
					options: this.menu.options.map((o, index) => ({
						index,
						label: o.label,
						icon: o.icon
					}))
				}
			});
			return true;
		}
		closeMenu() {
			if (!this.menu) return;
			this.menu = null;
			SetNuiFocus(false, false);
			SendNUIMessage({ action: NuiMessage.closeMenu });
		}
	};

// resource/client/camera.ts
/** How often the camera is read while markers are on screen (ms). */
	const INTERVAL = 24;
	/**
	* Sends the game camera to the overlay, which projects the markers itself: only while markers exist and only when
	* the camera moved, so a still camera costs three native reads per tick and no message.
	*/
	var CameraStream = class {
		timer = null;
		last = [
			0,
			0,
			0,
			0,
			0,
			0
		];
		set(on) {
			if (on && this.timer === null) {
				this.last = [
					0,
					0,
					0,
					0,
					0,
					0
				];
				this.tick();
				this.timer = setInterval(() => this.tick(), INTERVAL);
			} else if (!on && this.timer !== null) {
				clearInterval(this.timer);
				this.timer = null;
			}
		}
		tick() {
			const [x = 0, y = 0, z = 0] = GetFinalRenderedCamCoord();
			const [pitch = 0, , yaw = 0] = GetFinalRenderedCamRot(2);
			const fov = GetFinalRenderedCamFov();
			const l = this.last;
			if (Math.abs(x - (l[0] ?? 0)) < .005 && Math.abs(y - (l[1] ?? 0)) < .005 && Math.abs(z - (l[2] ?? 0)) < .005 && Math.abs(pitch - (l[3] ?? 0)) < .02 && Math.abs(yaw - (l[4] ?? 0)) < .02 && Math.abs(fov - (l[5] ?? 0)) < .01) return;
			this.last = [
				x,
				y,
				z,
				pitch,
				yaw,
				fov
			];
			SendNUIMessage({
				action: NuiMessage.camera,
				data: this.last
			});
		}
	};

// resource/client/conditions.ts
	const log$1 = createLogger(ResourceName);
	/** The player's jobs and gangs with their grades, from ai-core's player data; read once per scan, not per option. */
	function currentMemberships() {
		const out = /* @__PURE__ */ new Map();
		for (const job of getPlayerData("jobs") ?? []) out.set(job.job, job.grade);
		for (const gang of getPlayerData("gangs") ?? []) out.set(gang.gang, Math.max(gang.grade, out.get(gang.gang) ?? -1));
		return out;
	}
	function inGroups(groups, held) {
		if (typeof groups === "string") return held.has(groups);
		if (Array.isArray(groups)) return groups.some((name) => held.has(name));
		return Object.entries(groups).some(([name, grade]) => (held.get(name) ?? -1) >= grade);
	}
	/**
	* Whether an option may show now: its groups, then its own canInteract. Options come from other resources: one
	* that throws is treated as hidden and logged, never breaks targeting.
	*/
	function allowed(option, entity, distance, coords, held) {
		if (option.groups !== void 0 && !inGroups(option.groups, held)) return false;
		if (!option.canInteract) return true;
		try {
			return Boolean(option.canInteract(entity, distance, [
				coords.x,
				coords.y,
				coords.z
			], option.name));
		} catch (error) {
			log$1.error(`canInteract of "${option.name}" from ${option.resource} failed`, error);
			return false;
		}
	}

// resource/client/geometry.ts
/** Bone-less ped options sit on the chest. */
	const PED_CHEST_BONE = 24818;
	/** Model bounding boxes, read once per model (they never change). */
	const dims = /* @__PURE__ */ new Map();
	function dimensionsOf(model) {
		let box = dims.get(model);
		if (!box) {
			box = GetModelDimensions(model);
			dims.set(model, box);
		}
		return box;
	}
	/**
	* Where an entity's marker stands: a ped's chest, the centre of anything else. Fixed to the entity, never to where
	* the player stands, so the marker does not slide while walking around it.
	*/
	function entityAnchor(entity, model, isPed) {
		if (isPed) {
			const [x = 0, y = 0, z = 0] = GetPedBoneCoords(entity, PED_CHEST_BONE, 0, 0, 0);
			return {
				x,
				y,
				z
			};
		}
		const [min = [], max = []] = dimensionsOf(model);
		const [x = 0, y = 0, z = 0] = GetOffsetFromEntityInWorldCoords(entity, ((min[0] ?? 0) + (max[0] ?? 0)) / 2, ((min[1] ?? 0) + (max[1] ?? 0)) / 2, ((min[2] ?? 0) + (max[2] ?? 0)) / 2);
		return {
			x,
			y,
			z
		};
	}
	/**
	* Distance from the player to the entity's body (its bounding box, 0 inside): standing at the back of a bus counts
	* as standing at the bus. Option reach is measured with this.
	*/
	function entityDistance(entity, model, from) {
		const [min = [], max = []] = dimensionsOf(model);
		const [lx = 0, ly = 0, lz = 0] = GetOffsetFromEntityGivenWorldCoords(entity, from.x, from.y, from.z);
		const dx = Math.max((min[0] ?? 0) - lx, 0, lx - (max[0] ?? 0));
		const dy = Math.max((min[1] ?? 0) - ly, 0, ly - (max[1] ?? 0));
		const dz = Math.max((min[2] ?? 0) - lz, 0, lz - (max[2] ?? 0));
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

// resource/client/walker.ts
/** Entities read per frame; the rest waits for the next frame so a full pool never costs one long frame. */
	const PER_FRAME = 200;
	const POOLS = [
		{
			pool: "CPed",
			kind: "ped"
		},
		{
			pool: "CVehicle",
			kind: "vehicle"
		},
		{
			pool: "CObject",
			kind: "object"
		}
	];
	const unsigned = (hash) => hash >>> 0;
	/** Which kind of entity a model is (models are registered without saying so). */
	function kindOfModel(model) {
		return IsModelAPed(model) ? "ped" : IsModelAVehicle(model) ? "vehicle" : "object";
	}
	/**
	* Finds the entities around the player that have options, once a second: only the pools that can hold one (a pool
	* with a registered model or with global options) are read, in slices across frames.
	*/
	var Walker = class {
		nearby = [];
		poolsVersion = -1;
		modelPools = /* @__PURE__ */ new Set();
		/** The pools to read now: global options of the kind, or a registered model of that kind. */
		pools() {
			if (this.poolsVersion !== registry.modelsVersion) {
				this.poolsVersion = registry.modelsVersion;
				this.modelPools = new Set([...registry.models.map.keys()].map(kindOfModel));
			}
			const g = registry.globals;
			return POOLS.filter(({ kind }) => this.modelPools.has(kind) || g[kind].length > 0 || kind === "ped" && g.player.length > 0);
		}
		async walk() {
			const [px = 0, py = 0, pz = 0] = GetEntityCoords(cache.ped, false);
			const found = [];
			const seen = /* @__PURE__ */ new Set();
			const keep = (entity, kind) => {
				if (seen.has(entity)) return;
				seen.add(entity);
				const netId = NetworkGetEntityIsNetworked(entity) ? NetworkGetNetworkIdFromEntity(entity) : false;
				found.push({
					entity,
					model: unsigned(GetEntityModel(entity)),
					kind,
					netId
				});
			};
			const near = (entity) => {
				const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
				const dx = x - px;
				const dy = y - py;
				const dz = z - pz;
				return dx * dx + dy * dy + dz * dz <= 625;
			};
			for (const entity of registry.localEntities.map.keys()) if (DoesEntityExist(entity) && near(entity)) keep(entity, kindOf(entity));
			for (const netId of registry.netEntities.map.keys()) {
				if (!NetworkDoesEntityExistWithNetworkId(netId)) continue;
				const entity = NetworkGetEntityFromNetworkId(netId);
				if (near(entity)) keep(entity, kindOf(entity));
			}
			let read = 0;
			for (const { pool, kind } of this.pools()) {
				const handles = GetGamePool(pool);
				if (!Array.isArray(handles)) continue;
				const globals = registry.globals[kind].length > 0 || kind === "ped" && registry.globals.player.length > 0;
				for (const entity of handles) {
					if (++read % PER_FRAME === 0) await sleep(0);
					if (entity === cache.ped || !DoesEntityExist(entity)) continue;
					if (!globals && !registry.models.map.has(unsigned(GetEntityModel(entity)))) continue;
					if (!near(entity)) continue;
					keep(entity, kind === "ped" && IsPedAPlayer(entity) ? "player" : kind);
				}
			}
			this.nearby = found;
		}
	};
	/** The global kind of an entity found by handle (entity type 1 ped, 2 vehicle, 3 object). */
	function kindOf(entity) {
		const type = GetEntityType(entity);
		if (type === 1) return IsPedAPlayer(entity) ? "player" : "ped";
		return type === 2 ? "vehicle" : "object";
	}

// resource/client/scanner.ts
	const log = createLogger(ResourceName);
	const SCAN_NEAR = 250;
	const SCAN_IDLE = 1e3;
	const WALK_EVERY = 1e3;
	/** Zones are looked up this far around the player (their circle radius is added). */
	const ZONE_RANGE = 15;
	/** Line of sight is probed for at most this many markers per scan, the nearest first. */
	const LOS_LIMIT = 16;
	/** Line of sight one scan behind: a probe started now is read on the next scan, so nothing waits for it. */
	var Sight = class {
		probes = /* @__PURE__ */ new Map();
		visible(key) {
			return this.probes.get(key)?.visible ?? true;
		}
		update(points) {
			const [cx = 0, cy = 0, cz = 0] = GetFinalRenderedCamCoord();
			const keep = /* @__PURE__ */ new Set();
			for (const point of points.slice(0, LOS_LIMIT)) {
				keep.add(point.key);
				const probe = this.probes.get(point.key);
				if (probe) {
					const [status, hit] = GetShapeTestResult(probe.handle);
					if (status === 1) continue;
					probe.visible = !hit;
				}
				const handle = StartShapeTestLosProbe(cx, cy, cz, point.coords.x, point.coords.y, point.coords.z, 1, cache.ped, 7);
				this.probes.set(point.key, {
					handle,
					visible: probe?.visible ?? true
				});
			}
			for (const key of this.probes.keys()) if (!keep.has(key)) this.probes.delete(key);
		}
	};
	/**
	* The target loop: every 250 ms while markers are around (1 s otherwise) it reads the zones and entities near the
	* player, decides which options show and which are usable, and sends the marker list to the overlay only when it
	* changed. Off while the game is not on the player's own camera, in a vehicle, dead or paused.
	*/
	var Scanner = class {
		points = /* @__PURE__ */ new Map();
		disabled = false;
		walker = new Walker();
		sight = new Sight();
		camera = new CameraStream();
		zones = [];
		lastWalk = 0;
		lastSent = "";
		timer = null;
		start() {
			if (this.timer === null) this.timer = setTimeout(() => void this.run(), 0);
		}
		active() {
			return !this.disabled && !IsPauseMenuActive() && !IsNuiFocused() && GetRenderingCam() === -1 && cache.vehicle === false && !IsEntityDead(cache.ped);
		}
		async run() {
			try {
				if (this.active()) {
					if (GetGameTimer() - this.lastWalk >= WALK_EVERY) {
						this.lastWalk = GetGameTimer();
						await this.walker.walk();
					}
					this.scan();
				} else this.clear();
			} catch (error) {
				log.error("target scan failed", error);
			}
			this.timer = setTimeout(() => void this.run(), this.points.size ? SCAN_NEAR : SCAN_IDLE);
		}
		clear() {
			this.points.clear();
			this.send([]);
		}
		scan() {
			const [px = 0, py = 0, pz = 0] = GetEntityCoords(cache.ped, false);
			const player = {
				x: px,
				y: py,
				z: pz
			};
			const held = currentMemberships();
			const found = [];
			registry.zones.near(px, py, ZONE_RANGE, this.zones);
			for (const zone of this.zones) {
				const coords = zoneAnchor(zone, pz);
				const distance = Math.hypot(coords.x - px, coords.y - py, coords.z - pz);
				this.collect(found, `z:${zone.id}`, 0, zone.id, coords, distance, zone.options, held);
			}
			for (const near of this.walker.nearby) {
				if (!DoesEntityExist(near.entity)) continue;
				const options = [
					...registry.localEntities.map.get(near.entity) ?? [],
					...near.netId !== false ? registry.netEntities.map.get(near.netId) ?? [] : [],
					...registry.models.map.get(near.model) ?? [],
					...registry.globals[near.kind]
				];
				if (options.length === 0) continue;
				const isPed = near.kind === "ped" || near.kind === "player";
				const distance = isPed ? Math.hypot(...difference(entityAnchor(near.entity, near.model, true), player)) : entityDistance(near.entity, near.model, player);
				this.collect(found, `e:${near.entity}`, near.entity, null, entityAnchor(near.entity, near.model, isPed), distance, options, held);
			}
			found.sort((a, b) => a.distance - b.distance);
			this.sight.update(found);
			this.points.clear();
			for (const point of found) if (this.sight.visible(point.key)) this.points.set(point.key, point);
			this.send([...this.points.values()]);
		}
		collect(out, key, entity, zone, coords, distance, options, held) {
			const visible = [];
			const usable = [];
			for (const option of options) {
				const reach = reachOf(option);
				if (distance > reach + 3 || !allowed(option, entity, distance, coords, held)) continue;
				visible.push(option);
				if (distance <= reach) usable.push(option);
			}
			if (visible.length) out.push({
				key,
				entity,
				zone,
				coords,
				distance,
				usable,
				visible
			});
		}
		/** The overlay gets the list only when something it draws changed. */
		send(points) {
			const list = points.map((p) => ({
				key: p.key,
				x: round(p.coords.x),
				y: round(p.coords.y),
				z: round(p.coords.z),
				label: (p.usable[0] ?? p.visible[0])?.label ?? "",
				count: p.usable.length,
				reachable: p.usable.length > 0
			}));
			const key = interactKey();
			const text = JSON.stringify(list) + key;
			if (text === this.lastSent) return;
			this.lastSent = text;
			SendNUIMessage({
				action: NuiMessage.points,
				data: {
					points: list,
					key
				}
			});
			this.camera.set(list.length > 0);
		}
	};
	const round = (n) => Math.round(n * 100) / 100;
	/** ai-core's interaction key as the player bound it (a mouse or pad binding comes back as an icon code: shown as E). */
	const INTERACT = GetHashKey("+aicore_interact_E") | 2147483648;
	function interactKey() {
		const label = GetControlInstructionalButton(0, INTERACT, true).substring(2);
		return /^\w{1,6}$/.test(label) ? label : "E";
	}
	const difference = (a, b) => [
		a.x - b.x,
		a.y - b.y,
		a.z - b.z
	];

// resource/client/index.ts
	const scanner = new Scanner();
	new Interaction(scanner);
	registerApi(scanner);
	scanner.start();

})();
}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}
