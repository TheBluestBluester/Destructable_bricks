const { brs } = OMEGGA_UTIL;
const raycasttest = require('./Raycast')

let delay = 200;
let projrange = 400;
let spawned = [];
let e = false;
let enablechecker = false;
let ProjectileCheckInterval;
class Destructable_bricks {
	
	constructor(omegga, config, store) {
		this.omegga = omegga;
		this.config = config;
		this.store = store
		delay = this.config.UpdateFrequency;
		projrange = this.config.DetectionRange;
	}
	async CheckProjectiles(enabled) {
		if(!enabled) { return; }
		// Gets location of the spherecomponent.
		const projectileRegExp = new RegExp(`SphereComponent .+?RelativeLocation = \\(X=(?<x>[\\d\\.-]+),Y=(?<y>[\\d\\.-]+),Z=(?<z>[\\d\\.-]+)\\)`);
		const projectiles = await this.omegga.addWatcher(projectileRegExp, {
			exec: () =>
			this.omegga.writeln(
				`GetAll SphereComponent RelativeLocation`
			),
			timeoutDelay: 45,
			bundle: true
		});
		if(projectiles[0] == null) {return;}
		let projectile = 0;
		let pos;
		let rot;
		let todelete = [];
		// This here exists so it doesnt keep activating on the same spherecomponent over and over again.
		for(var i in projectiles) {
			const pr = projectiles[i].input;
			if(todelete.includes(pr.substr(pr.indexOf(("_C_")),14),1)) {
				todelete.splice(todelete.indexOf(pr.substr(pr.indexOf(("_C_")),14),1));
			}
			if(!spawned.includes(pr.substr(pr.indexOf(("_C_")),14),1)){
				spawned.push(pr.substr(pr.indexOf(("_C_")),14),1);
				projectile = projectiles[i];
			}
		}
		if(todelete[0] !== 1) {
			for(var i in todelete) {
				spawned.splice(spawned.indexOf(todelete[i]),1);
			}
		}
		// e is supposed to prevent it form detecting previos projectiles or whatever idk it doesn't work eitherway.
		if(projectile !== 0 && e) {
			let outer = projectiles[0].input;
			outer = outer.substr(Number(outer.indexOf('PersistentLevel')) + 16, Number(outer.indexOf('CollisionComponent')) - Number(outer.indexOf('PersistentLevel')) - 17);
			const projectileRegExptwo = new RegExp(`${outer}\\.CollisionComponent.RelativeRotation = \\(Pitch=(?<pitch>[\\d\\.-]+),Yaw=(?<yaw>[\\d\\.-]+),Roll=(?<roll>[\\d\\.-]+)\\)`);
			// Gets rotation of the spherecomponent.
			const projrot = await this.omegga.addWatcher(projectileRegExptwo, {
			exec: () =>
			this.omegga.writeln(
				`GetAll SphereComponent RelativeRotation Outer=${outer}`
			),
			timeoutDelay: 45,
			bundle: true
			});
			// Gets BP_PlayerState_C which is used to get the player. Not required but may be usefull for minigames.
			const projtype = outer.substr(0,outer.indexOf('C_') + 1);
			let plstate = await this.omegga.addWatcher(new RegExp(`BP_PlayerState_C`), {
			exec: () =>
			this.omegga.writeln(
				`GetAll ${projtype} InstigatorState`
			),
			timeoutDelay: 45,
			bundle: true
			});
			let bpstate = plstate[0].input;
			bpstate = bpstate.substr(bpstate.indexOf('PersistentLevel.BP_PlayerState_C_') + 16, 27);
			if(projrot[0] == null) {return;}
			pos = projectiles[0].groups;
			rot = projrot[0].groups;
			this.raycast(pos, rot, bpstate);
		}
		else if(!e) {
			e = true;
		}
		
	}
	
	async raycast(pos, rot, playerstate) {
		const brs = await this.omegga.getSaveData({center: [pos.x,pos.y,pos.z], extent: [projrange,projrange,projrange]});
		if(brs == null) {return;}
		const yaw = Number(rot.yaw);
		const pitch = Number(rot.pitch);
		const deg2rad = Math.PI / 180;
		let ray1 = {x: Number(pos.x), y: Number(pos.y), z: Number(pos.z)};
		let hitbrick = []
		for(var B in brs.bricks) {
			
			let ray2 = {
			x: Number(pos.x) + Math.sin((-yaw + 90) * deg2rad) * projrange * Math.cos(pitch * deg2rad),
			y: Number(pos.y) + Math.cos((-yaw + 90) * deg2rad) * projrange * Math.cos(pitch * deg2rad),
			z: Number(pos.z) + projrange * Math.sin(pitch * deg2rad)
			};
			
			let brick = brs.bricks[B];
			let size = brick.size;
			if(brick.rotation%2 == 1) {
				size = [size[1],size[0],size[2]];
			}
			brick.size = size;
			const bpos = brick.position;
			const BP1 = {
			x: bpos[0] - size[0],
			y: bpos[1] - size[1],
			z: bpos[2] - size[2],
			};
			const BP2 = {
			x: bpos[0] + size[0],
			y: bpos[1] + size[1],
			z: bpos[2] + size[2],
			};
			if(await raycasttest.CheckLineBox(BP1, BP2, ray1, ray2)) {
				hitbrick.push({p: bpos, s: size});
			}
		}
		let closetbrick = projrange;
		let brc = 0
		// Get the closest brick.
		for(var b in hitbrick) {
			const br = hitbrick[b];
			const distance = Math.sqrt((br.p[0] - ray1.x)*(br.p[0] - ray1.x)+(br.p[1] - ray1.y)*(br.p[1] - ray1.y)+(br.p[2] - ray1.z)*(br.p[2] - ray1.z));
			if(distance < closetbrick) {
				closetbrick = distance;
				brc = br;
			}
		}
		if(brc.s == null) {return;}
		brc.s = [brc.s[0] + 50,brc.s[1] + 50,brc.s[2] + 50];
		if(brc !== 0) {
			this.omegga.clearRegion({center: brc.p, extent: brc.s});
		}
	}
	/*
	async getrotation(controller) {
		const rotRegExp = new RegExp(`${controller}\\.TransformComponent0.RelativeRotation = \\(Pitch=(?<x>[\\d\\.-]+),Yaw=(?<y>[\\d\\.-]+),Roll=(?<z>[\\d\\.-]+)\\)`);
		const [
		{
			groups: { x, y, z },
		},
		] = await this.omegga.addWatcher(rotRegExp, {
			exec: () =>
			this.omegga.writeln(
				`GetAll SceneComponent RelativeRotation Outer=${controller}`
			),
			timeoutDelay: 100,
			bundle: true
		});
		return [Number(x),Number(y),Number(z)];
	}
	*/
	async init() {
		ProjectileCheckInterval = setInterval(() => this.CheckProjectiles(enablechecker),delay);
		this.omegga.on('cmd:enable', async name => {
			enablechecker = !enablechecker;
			if(enablechecker) {
				this.omegga.broadcast("Checker enabled.");
			}
			else {
				this.omegga.broadcast("Checker disabled.");
			}
		})
		.on('cmd:test', async name => {
			this.test();
		});
		return { registeredCommands: ['enable'] };
	}
	async stop() {
		clearInterval(ProjectileCheckInterval);
	}
}
module.exports = Destructable_bricks;
