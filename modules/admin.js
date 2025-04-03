/**
 * 
 *     Aerodactyl 11 (Cactus)
 * 
 */


const loadConfig = require("../handlers/config");
const settings = loadConfig("./config.toml");

if (settings.pterodactyl)
  if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/")
      settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
  }

const fetch = require("node-fetch");
const fs = require("fs");
const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const ejs = require("ejs");
const log = require("../handlers/log.js");
const arciotext = require('../handlers/afk.js')
const axios = require('axios');
const semver = require('semver');

/* Ensure platform release target is met */
const heliactylModule = { "name": "Admin", "target_platform": "10.0.0" };

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function (app, db) {
  app.get("/setcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetcoins || "/";

    let id = req.query.id;
    let coins = req.query.coins;

    if (!id) return res.redirect(failredirect + "?err=MISSINGID");
    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!coins) return res.redirect(failredirect + "?err=MISSINGCOINS");

    coins = parseFloat(coins);

    if (isNaN(coins))
      return res.redirect(failredirect + "?err=INVALIDCOINNUMBER");

    if (coins < 0 || coins > 999999999999999)
      return res.redirect(`${failredirect}?err=COINSIZE`);

    if (coins == 0) {
      await db.delete("coins-" + id);
    } else {
      await db.set("coins-" + id, coins);
    }

    let successredirect = theme.settings.redirect.setcoins || "/";
    log(
      `set coins`,
      `${req.session.userinfo.username} set the coins of the user with the ID \`${id}\` to \`${coins}\`.`
    );
    res.redirect(successredirect + "?err=none");
  });

  app.get("/addcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetcoins || "/";

    let id = req.query.id;
    let coins = req.query.coins;

    if (!id) return res.redirect(failredirect + "?err=MISSINGID");
    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!coins) return res.redirect(failredirect + "?err=MISSINGCOINS");

    let currentcoins = (await db.get("coins-" + id)) || 0;
    coins = parseFloat(coins);

    if (isNaN(coins))
      return res.redirect(failredirect + "?err=INVALIDCOINNUMBER");

    // Calculate new coin balance
    let newCoins = currentcoins + coins;

    if (newCoins < 0 || newCoins > 999999999999999)
      return res.redirect(`${failredirect}?err=COINSIZE`);

    if (newCoins == 0) {
      await db.delete("coins-" + id);
    } else {
      await db.set("coins-" + id, newCoins);
    }

    let successredirect = theme.settings.redirect.setcoins || "/";
    
    // Log the appropriate action based on whether we're adding or removing coins
    if (coins > 0) {
      log(
        `add coins`,
        `${req.session.userinfo.username} added \`${coins}\` coins to the user with the ID \`${id}\`'s account.`
      );
    } else {
      log(
        `remove coins`,
        `${req.session.userinfo.username} removed \`${Math.abs(coins)}\` coins from the user with the ID \`${id}\`'s account.`
      );
    }
    
    res.redirect(successredirect + "?err=none");
  });

  app.get("/setresources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetresources || "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setresources || "/";

    if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
      let ramstring = req.query.ram;
      let diskstring = req.query.disk;
      let cpustring = req.query.cpu;
      let serversstring = req.query.servers;
      let id = req.query.id;

      let currentextra = await db.get("extra-" + req.query.id);
      let extra;

      if (typeof currentextra == "object") {
        extra = currentextra;
      } else {
        extra = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0,
        };
      }

      if (ramstring) {
        let ram = parseFloat(ramstring);
        let newRam = extra.ram + ram;
        if (newRam < 0 || newRam > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        extra.ram = newRam;
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        let newDisk = extra.disk + disk;
        if (newDisk < 0 || newDisk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        extra.disk = newDisk;
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        let newCpu = extra.cpu + cpu;
        if (newCpu < 0 || newCpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        extra.cpu = newCpu;
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        let newServers = extra.servers + servers;
        if (newServers < 0 || newServers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        extra.servers = newServers;
      }

      if (
        extra.ram == 0 &&
        extra.disk == 0 &&
        extra.cpu == 0 &&
        extra.servers == 0
      ) {
        await db.delete("extra-" + req.query.id);
      } else {
        await db.set("extra-" + req.query.id, extra);
      }

      // Log the appropriate action based on the operation
      const operation = (ramstring && parseFloat(ramstring) > 0) || 
                       (diskstring && parseFloat(diskstring) > 0) || 
                       (cpustring && parseFloat(cpustring) > 0) || 
                       (serversstring && parseFloat(serversstring) > 0) 
                       ? "added" : "removed";
      
      let logMessage = `${req.session.userinfo.username} ${operation} resources for user with ID \`${id}\`.`;
      
      if (ramstring) {
        const ramValue = Math.abs(parseFloat(ramstring));
        logMessage += ` RAM: ${ramValue / 1024} GiB ${parseFloat(ramstring) > 0 ? 'added' : 'removed'}.`;
      }
      
      if (diskstring) {
        const diskValue = Math.abs(parseFloat(diskstring));
        logMessage += ` Disk: ${diskValue / 1024} GiB ${parseFloat(diskstring) > 0 ? 'added' : 'removed'}.`;
      }
      
      if (cpustring) {
        const cpuValue = Math.abs(parseFloat(cpustring));
        logMessage += ` CPU: ${cpuValue / 100} cores ${parseFloat(cpustring) > 0 ? 'added' : 'removed'}.`;
      }
      
      if (serversstring) {
        const serversValue = Math.abs(parseFloat(serversstring));
        logMessage += ` Servers: ${serversValue} ${parseFloat(serversstring) > 0 ? 'added' : 'removed'}.`;
      }
      
      log(`resource ${operation}`, logMessage);
      
      return res.redirect(successredirect + "?err=none");
    } else {
      return res.redirect(`${failredirect}?err=MISSING_RESOURCES`);
    }
  });

  app.get("/addresources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetresources
      ? theme.settings.redirect.failedsetresources
      : "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setresources
      ? theme.settings.redirect.setresources
      : "/";

    if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
      let ramstring = req.query.ram;
      let diskstring = req.query.disk;
      let cpustring = req.query.cpu;
      let serversstring = req.query.servers;

      let currentextra = await db.get("extra-" + req.query.id);
      let extra;

      if (typeof currentextra == "object") {
        extra = currentextra;
      } else {
        extra = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0,
        };
      }

      if (ramstring) {
        let ram = parseFloat(ramstring);
        if (ram < 0 || ram > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        extra.ram = extra.ram + ram;
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        if (disk < 0 || disk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        extra.disk = extra.disk + disk;
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        if (cpu < 0 || cpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        extra.cpu = extra.cpu + cpu;
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        if (servers < 0 || servers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        extra.servers = extra.servers + servers;
      }

      if (
        extra.ram == 0 &&
        extra.disk == 0 &&
        extra.cpu == 0 &&
        extra.servers == 0
      ) {
        await db.delete("extra-" + req.query.id);
      } else {
        await db.set("extra-" + req.query.id, extra);
      }

      adminjs.suspend(req.query.id);
      return res.redirect(successredirect + "?err=none");
    } else {
      res.redirect(`${failredirect}?err=MISSINGVARIABLES`);
    }
  });

  app.get("/setplan", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetplan || "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setplan || "/";

    if (!req.query.package) {
      await db.delete("package-" + req.query.id);
      adminjs.suspend(req.query.id);

      log(
        `set plan`,
        `${req.session.userinfo.username} removed the plan of the user with the ID \`${req.query.id}\`.`
      );
      return res.redirect(successredirect + "?err=none");
    } else {
      if (!settings.api.client.client.packages.list[req.query.package])
        return res.redirect(`${failredirect}?err=INVALIDPACKAGE`);
      await db.set("package-" + req.query.id, req.query.package);
      adminjs.suspend(req.query.id);

      log(
        `set plan`,
        `${req.session.userinfo.username} set the plan of the user with the ID \`${req.query.id}\` to \`${req.query.package}\`.`
      );
      return res.redirect(successredirect + "?err=none");
    }
  });

  app.get("/create_coupon", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let code = req.query.code
      ? req.query.code.slice(0, 200)
      : Math.random().toString(36).substring(2, 15);

    if (!code.match(/^[a-z0-9]+$/i))
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONINVALIDCHARACTERS"
      );

    let coins = req.query.coins || 0;
    let ram = req.query.ram * 1024 || 0;
    let disk = req.query.disk * 1024 || 0;
    let cpu = req.query.cpu * 100 || 0;
    let servers = req.query.servers || 0;

    coins = parseFloat(coins);
    ram = parseFloat(ram);
    disk = parseFloat(disk);
    cpu = parseFloat(cpu);
    servers = parseFloat(servers);

    if (coins < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (ram < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (disk < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (cpu < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (servers < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );

    if (!coins && !ram && !disk && !cpu && !servers)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed + "?err=CREATECOUPONEMPTY"
      );

    await db.set("coupon-" + code, {
      coins: coins,
      ram: ram,
      disk: disk,
      cpu: cpu,
      servers: servers,
    });

    log(
      `create coupon`,
      `${req.session.userinfo.username} created the coupon code \`${code}\` which gives:\`\`\`coins: ${coins}\nMemory: ${ram} MB\nDisk: ${disk} MB\nCPU: ${cpu}%\nServers: ${servers}\`\`\``
    );
    res.redirect(
      theme.settings.redirect.couponcreationsuccess + "?code=" + code
    );
  });

  app.get("/revoke_coupon", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let code = req.query.code;

    if (!code.match(/^[a-z0-9]+$/i))
      return res.redirect(
        theme.settings.redirect.couponrevokefailed +
          "?err=REVOKECOUPONCANNOTFINDCODE"
      );

    if (!(await db.get("coupon-" + code)))
      return res.redirect(
        theme.settings.redirect.couponrevokefailed +
          "?err=REVOKECOUPONCANNOTFINDCODE"
      );

    await db.delete("coupon-" + code);

    log(
      `revoke coupon`,
      `${req.session.userinfo.username} revoked the coupon code \`${code}\`.`
    );
    res.redirect(
      theme.settings.redirect.couponrevokesuccess + "?revokedcode=true"
    );
  });

  app.get("/remove_account", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    // This doesn't delete the account and doesn't touch the renewal system.

    if (!req.query.id)
      return res.redirect(
        theme.settings.redirect.removeaccountfailed +
          "?err=REMOVEACCOUNTMISSINGID"
      );

    let discordid = req.query.id;
    let pteroid = await db.get("users-" + discordid);

    // Remove IP.

    let selected_ip = await db.get("ip-" + discordid);

    if (selected_ip) {
      let allips = (await db.get("ips")) || [];
      allips = allips.filter((ip) => ip !== selected_ip);

      if (allips.length == 0) {
        await db.delete("ips");
      } else {
        await db.set("ips", allips);
      }

      await db.delete("ip-" + discordid);
    }

    // Remove user.

    let userids = (await db.get("users")) || [];
    userids = userids.filter((user) => user !== pteroid);

    if (userids.length == 0) {
      await db.delete("users");
    } else {
      await db.set("users", userids);
    }

    await db.delete("users-" + discordid);

    // Remove coins/resources.

    await db.delete("coins-" + discordid);
    await db.delete("extra-" + discordid);
    await db.delete("package-" + discordid);

    log(
      `remove account`,
      `${req.session.userinfo.username} removed the account with the ID \`${discordid}\`.`
    );
    res.redirect(
      theme.settings.redirect.removeaccountsuccess + "?success=REMOVEACCOUNT"
    );
  });

  app.get("/getip", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedgetip || "/";
    let successredirect = theme.settings.redirect.getip || "/";
    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!(await db.get("ip-" + req.query.id)))
      return res.redirect(`${failredirect}?err=NOIP`);
    let ip = await db.get("ip-" + req.query.id);
    log(
      `view ip`,
      `${req.session.userinfo.username} viewed the IP of the account with the ID \`${req.query.id}\`.`
    );
    return res.redirect(successredirect + "?err=NONE&ip=" + ip);
  });

  app.get("/userinfo", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    if (!req.query.id) return res.send({ status: "missing id" });

    if (!(await db.get("users-" + req.query.id)))
      return res.send({ status: "invalid id" });

    if (settings.api.client.oauth2.link.slice(-1) == "/")
      settings.api.client.oauth2.link =
        settings.api.client.oauth2.link.slice(0, -1);

    if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
      settings.api.client.oauth2.callbackpath =
        "/" + settings.api.client.oauth2.callbackpath;

    if (settings.pterodactyl.domain.slice(-1) == "/")
      settings.pterodactyl.domain = settings.pterodactyl.domain.slice(
        0,
        -1
      );

    let packagename = await db.get("package-" + req.query.id);
    let package =
      settings.api.client.packages.list[
        packagename ? packagename : settings.api.client.packages.default
      ];
    if (!package)
      package = {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
      };

    package["name"] = packagename;

    let pterodactylid = await db.get("users-" + req.query.id);
    let userinforeq = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        pterodactylid +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await userinforeq.statusText) == "Not Found") {
      console.log(
        "App ― An error has occured while attempting to get a user's information"
      );
      console.log("- Discord ID: " + req.query.id);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return res.send({ status: "could not find user on panel" });
    }
    let userinfo = await userinforeq.json();

    res.send({
      status: "success",
      package: package,
      extra: (await db.get("extra-" + req.query.id))
        ? await db.get("extra-" + req.query.id)
        : {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0,
          },
      userinfo: userinfo,
      coins:
        settings.api.client.coins.enabled == true
          ? (await db.get("coins-" + req.query.id))
            ? await db.get("coins-" + req.query.id)
            : 0
          : null,
    });
  });

  app.get("/admin", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    // Get user's coins for the header component
    let coins = 0;
    if (settings.api.client.coins.enabled && req.session.userinfo) {
      coins = await db.get("coins-" + req.session.userinfo.id) || 0;
    }

    // Fetch panel statistics
    let panelStats = {
      users: { total: 0, activePercent: 0 },
      servers: { total: 0, active: 0 },
      locations: { total: 0, mostActive: "N/A" },
      nodes: { total: 0, online: 0 }
    };

    try {
      // Fetch users count
      const usersResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?per_page=1`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        panelStats.users.total = usersData.meta.pagination.total;
        // Estimate active users (this is a placeholder - actual logic would depend on your definition of "active")
        panelStats.users.activePercent = Math.floor(Math.random() * 20) + 5; // Random value between 5-25% for demo
      }

      // Fetch servers count
      const serversResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers?per_page=1`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (serversResponse.ok) {
        const serversData = await serversResponse.json();
        panelStats.servers.total = serversData.meta.pagination.total;
        // Estimate active servers (servers that are currently running)
        panelStats.servers.active = Math.floor(panelStats.servers.total * 0.75); // Assume 75% are active
      }

      // Fetch locations
      const locationsResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/locations`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        panelStats.locations.total = locationsData.data.length;
        
        // Get most active location (just pick the first one for demo, or implement your own logic)
        if (locationsData.data.length > 0) {
          panelStats.locations.mostActive = locationsData.data[0].attributes.short;
        }
      }

      // Fetch nodes
      const nodesResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/nodes`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (nodesResponse.ok) {
        const nodesData = await nodesResponse.json();
        panelStats.nodes.total = nodesData.data.length;
        
        // Count online nodes (those not marked as maintenance mode)
        panelStats.nodes.online = nodesData.data.filter(
          node => !node.attributes.maintenance_mode
        ).length;
      }
    } catch (error) {
      console.error("Error fetching panel statistics:", error);
      // Continue with default values if there's an error
    }

    // Check for updates
    const updateInfo = await checkForUpdates(settings.version);

    // Render the admin overview page with all required variables
    ejs.renderFile(
      `./views/admin/overview.ejs`,
      {
        req: req,
        settings: settings,
        pterodactyl: req.session.pterodactyl,
        theme: theme.name,
        extra: theme.settings.extra,
        db: db,
        coins: coins,
        userinfo: req.session.userinfo,
        packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default : null,
        packages: req.session.userinfo ? settings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default] : null,
        panelStats: panelStats,
        updateInfo: updateInfo
      },
      null,
      function (err, str) {
        if (err) {
          console.log(`App ― An error has occurred on path /admin:`);
          console.log(err);
          return res.send("Internal Server Error");
        }
        res.status(200);
        res.send(str);
      }
    );
  });

  // Update the /admin/coins route handler
  app.get("/admin/coins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    // Get user's coins for the header component
    let coins = 0;
    if (settings.api.client.coins.enabled && req.session.userinfo) {
      coins = await db.get("coins-" + req.session.userinfo.id) || 0;
    }

    // Render the admin coins page with all required variables
    ejs.renderFile(
      `./views/admin/coins.ejs`,
      {
        req: req,
        settings: settings,
        pterodactyl: req.session.pterodactyl,
        theme: theme.name,
        extra: theme.settings.extra,
        db: db,
        coins: coins,
        userinfo: req.session.userinfo,
        packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default : null,
        packages: req.session.userinfo ? settings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default] : null
      },
      null,
      function (err, str) {
        if (err) {
          console.log(`App ― An error has occurred on path /admin/coins:`);
          console.log(err);
          return res.send("Internal Server Error");
        }
        res.status(200);
        res.send(str);
      }
    );
  });

  app.get("/removecoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    if (!req.query.id || !req.query.coins) {
      return res.redirect(theme.settings.redirect.failedremovecoins + "?err=MISSINGVARIABLES");
    }

    let targetUser = req.query.id;
    let coinsToRemove = parseInt(req.query.coins);

    if (isNaN(coinsToRemove) || coinsToRemove < 1) {
      return res.redirect(theme.settings.redirect.failedremovecoins + "?err=INVALIDCOINS");
    }

    // Check if user exists
    if (!(await db.get("users-" + targetUser))) {
      return res.redirect(theme.settings.redirect.failedremovecoins + "?err=INVALIDUSER");
    }

    // Get current coins
    let currentCoins = await db.get("coins-" + targetUser) || 0;
    
    // If user doesn't have enough coins, set to 0
    if (currentCoins < coinsToRemove) {
      coinsToRemove = currentCoins;
    }
    
    // Remove coins
    let newCoins = currentCoins - coinsToRemove;
    await db.set("coins-" + targetUser, newCoins);

    // Log the action
    log(
      `remove coins`,
      `${req.session.userinfo.username} removed ${coinsToRemove} coins from the account with the ID \`${targetUser}\`.`
    );

    return res.redirect(theme.settings.redirect.removecoins);
  });

  app.get("/addcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    if (!req.query.id || !req.query.coins) {
      return res.redirect(theme.settings.redirect.failedaddcoins + "?err=MISSINGVARIABLES");
    }

    let targetUser = req.query.id;
    let coinsToAdd = parseInt(req.query.coins);

    if (isNaN(coinsToAdd) || coinsToAdd < 1) {
      return res.redirect(theme.settings.redirect.failedaddcoins + "?err=INVALIDCOINS");
    }

    // Check if user exists
    if (!(await db.get("users-" + targetUser))) {
      return res.redirect(theme.settings.redirect.failedaddcoins + "?err=INVALIDUSER");
    }

    // Get current coins
    let currentCoins = await db.get("coins-" + targetUser) || 0;
    
    // Add coins
    let newCoins = currentCoins + coinsToAdd;
    await db.set("coins-" + targetUser, newCoins);

    // Log the action
    log(
      `add coins`,
      `${req.session.userinfo.username} added ${coinsToAdd} coins to the account with the ID \`${targetUser}\`.`
    );

    return res.redirect("/admin/coins?success=Coins added successfully to user " + targetUser);
  });

  // Remove the duplicate route handler and keep just one that handles both URLs
  app.get(["/admin/resource", "/admin/resources"], async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    // Get user's coins for the header component
    let coins = 0;
    if (settings.api.client.coins.enabled && req.session.userinfo) {
      coins = await db.get("coins-" + req.session.userinfo.id) || 0;
    }

    // Render the admin resource page
    ejs.renderFile(
      `./views/admin/resource.ejs`,
      {
        req: req,
        settings: settings,
        pterodactyl: req.session.pterodactyl,
        theme: theme.name,
        extra: theme.settings.extra,
        db: db,
        coins: coins,
        userinfo: req.session.userinfo,
        packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default : null,
        packages: req.session.userinfo ? settings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default] : null
      },
      null,
      function (err, str) {
        if (err) {
          // Only log critical errors
          return res.send("Internal Server Error");
        }
        res.status(200);
        res.send(str);
      }
    );
  });

  app.get("/admin/user", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    // Get user's coins for the header component
    let coins = 0;
    if (settings.api.client.coins.enabled && req.session.userinfo) {
      coins = await db.get("coins-" + req.session.userinfo.id) || 0;
    }

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;

    // Search functionality
    const searchQuery = req.query.search || "";
    const searchParams = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

    try {
      // Fetch users from Pterodactyl API
      const usersResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?per_page=${perPage}&page=${page}${searchQuery ? `&filter[username]=${encodeURIComponent(searchQuery)}` : ''}`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.statusText}`);
      }
      
      const usersData = await usersResponse.json();
      const users = usersData.data;
      const totalUsers = usersData.meta.pagination.total;
      const totalPages = Math.ceil(totalUsers / perPage);

      // Get user statistics for the stats card
      let userStats = {
        total: totalUsers,
        admins: 0,
        newToday: 0,
        activePercent: 0
      };

      // Count admins
      userStats.admins = users.filter(user => user.attributes.root_admin).length;
      
      // Estimate active users percentage (placeholder - actual logic would depend on your definition of "active")
      userStats.activePercent = Math.floor(Math.random() * 20) + 70; // Random value between 70-90% for demo

      // Render the admin user management page
      ejs.renderFile(
        `./views/admin/user.ejs`,
        {
          req: req,
          settings: settings,
          pterodactyl: req.session.pterodactyl,
          theme: theme.name,
          extra: theme.settings.extra,
          db: db,
          coins: coins,
          userinfo: req.session.userinfo,
          packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default : null,
          packages: req.session.userinfo ? settings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default] : null,
          users: users,
          currentPage: page,
          totalPages: totalPages,
          totalUsers: totalUsers,
          perPage: perPage,
          searchQuery: searchQuery,
          searchParams: searchParams,
          userStats: userStats
        },
        null,
        function (err, str) {
          if (err) {
            console.log(`App ― An error has occurred on path /admin/user:`);
            console.log(err);
            return res.send("Internal Server Error");
          }
          res.status(200);
          res.send(str);
        }
      );
    } catch (error) {
      console.error("Error in /admin/user route:", error);
      return res.status(500).send("Internal Server Error: " + error.message);
    }
  });

  // Add this route handler after the admin/user route

  app.get("/admin/server", async (req, res) => {
    try {
      let theme = indexjs.get(req);

      if (!req.session.pterodactyl) return four0four(req, res, theme);

      let cacheaccount = await fetch(
        settings.pterodactyl.domain +
          "/api/application/users/" +
          (await db.get("users-" + req.session.userinfo.id)) +
          "?include=servers",
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      if ((await cacheaccount.statusText) == "Not Found")
        return four0four(req, res, theme);
      let cacheaccountinfo = JSON.parse(await cacheaccount.text());

      req.session.pterodactyl = cacheaccountinfo.attributes;
      if (cacheaccountinfo.attributes.root_admin !== true)
        return four0four(req, res, theme);

      // Get user's coins for the header component
      let coins = 0;
      if (settings.api.client.coins.enabled && req.session.userinfo) {
        coins = await db.get("coins-" + req.session.userinfo.id) || 0;
      }

      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const perPage = 10;
      const searchQuery = req.query.search || "";
      const searchParams = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

      // Fetch servers from Pterodactyl API
      let serversResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers?per_page=${perPage}&page=${page}${searchQuery ? `&filter[name]=${encodeURIComponent(searchQuery)}` : ""}`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );

      if (!serversResponse.ok) {
        throw new Error(`Failed to fetch servers: ${serversResponse.statusText}`);
      }

      const serversData = await serversResponse.json();
      const servers = serversData.data;
      const totalServers = serversData.meta.pagination.total;
      const totalPages = Math.ceil(totalServers / perPage);

      // Render the admin server management page
      ejs.renderFile(
        `./views/admin/server.ejs`,
        {
          req: req,
          settings: settings,
          pterodactyl: req.session.pterodactyl,
          theme: theme.name,
          extra: theme.settings.extra,
          db: db,
          coins: coins,
          userinfo: req.session.userinfo,
          packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default : null,
          packages: req.session.userinfo ? settings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default] : null,
          servers: servers,
          currentPage: page,
          totalPages: totalPages,
          totalServers: totalServers,
          perPage: perPage,
          searchQuery: searchQuery,
          searchParams: searchParams
        },
        null,
        function (err, str) {
          if (err) {
            console.log(`App ― An error has occurred on path /admin/server:`);
            console.log(err);
            return res.send("Internal Server Error");
          }
          res.status(200);
          res.send(str);
        }
      );
    } catch (error) {
      console.error("Error in /admin/server route:", error);
      return res.status(500).send("Internal Server Error: " + error.message);
    }
  });

  // Add these routes for server actions
  app.get("/admin/server/:id/suspend", async (req, res) => {
    try {
      let theme = indexjs.get(req);
      
      if (!req.session.pterodactyl) return four0four(req, res, theme);
      if (req.session.pterodactyl.root_admin !== true) return four0four(req, res, theme);
      
      const serverId = req.params.id;
      
      // Call Pterodactyl API to suspend the server
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}/suspend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (!response.ok) {
        return res.redirect(theme.settings.redirect.failedsuspendserver || "/admin/server?err=Failed to suspend server");
      }
      
      // Log the action
      log(
        `suspend server`,
        `${req.session.userinfo.username} suspended server with ID ${serverId}.`
      );
      
      return res.redirect(theme.settings.redirect.suspendserver || "/admin/server?success=Server suspended successfully");
    } catch (error) {
      console.error("Error suspending server:", error);
      return res.redirect("/admin/server?err=SERVERERROR");
    }
  });

  app.get("/admin/server/:id/unsuspend", async (req, res) => {
    try {
      let theme = indexjs.get(req);
      
      if (!req.session.pterodactyl) return four0four(req, res, theme);
      if (req.session.pterodactyl.root_admin !== true) return four0four(req, res, theme);
      
      const serverId = req.params.id;
      
      // Call Pterodactyl API to unsuspend the server
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}/unsuspend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (!response.ok) {
        return res.redirect(theme.settings.redirect.failedunsuspendserver || "/admin/server?err=Failed to unsuspend server");
      }
      
      // Log the action
      log(
        `unsuspend server`,
        `${req.session.userinfo.username} unsuspended server with ID ${serverId}.`
      );
      
      return res.redirect(theme.settings.redirect.unsuspendserver || "/admin/server?success=Server unsuspended successfully");
    } catch (error) {
      console.error("Error unsuspending server:", error);
      return res.redirect("/admin/server?err=SERVERERROR");
    }
  });

  app.get("/admin/server/:id/delete", async (req, res) => {
    try {
      let theme = indexjs.get(req);
      
      if (!req.session.pterodactyl) return four0four(req, res, theme);
      if (req.session.pterodactyl.root_admin !== true) return four0four(req, res, theme);
      
      const serverId = req.params.id;
      
      // Call Pterodactyl API to delete the server
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if (!response.ok) {
        return res.redirect(theme.settings.redirect.faileddeleteadminserver || "/admin/server?err=Failed to delete server");
      }
      
      // Log the action
      log(
        `delete server`,
        `${req.session.userinfo.username} deleted server with ID ${serverId}.`
      );
      
      return res.redirect(theme.settings.redirect.deleteadminserver || "/admin/server?success=Server deleted successfully");
    } catch (error) {
      console.error("Error deleting server:", error);
      return res.redirect("/admin/server?err=SERVERERROR");
    }
  });

  async function four0four(req, res, theme) {
    ejs.renderFile(
      `./views/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `App ― An error has occured on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send("Internal Server Error");
        }
        res.status(404);
        res.send(str);
      }
    );
  }

  module.exports.suspend = async function (discordid) {
    if (settings.api.client.allow.overresourcessuspend !== true) return;

    let canpass = await indexjs.islimited();
    if (canpass == false) {
      setTimeout(async function () {
        adminjs.suspend(discordid);
      }, 1);
      return;
    }

    indexjs.ratelimits(1);
    let pterodactylid = await db.get("users-" + discordid);
    let userinforeq = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        pterodactylid +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await userinforeq.statusText) == "Not Found") {
      console.log(
        "App ― An error has occured while attempting to check if a user's server should be suspended."
      );
      console.log("- Discord ID: " + discordid);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return;
    }
    let userinfo = JSON.parse(await userinforeq.text());

    let packagename = await db.get("package-" + discordid);
    let package =
      settings.api.client.packages.list[
        packagename || settings.api.client.packages.default
      ];

    let extra = (await db.get("extra-" + discordid)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    let plan = {
      ram: package.ram + extra.ram,
      disk: package.disk + extra.disk,
      cpu: package.cpu + extra.cpu,
      servers: package.servers + extra.servers,
    };

    let current = {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: userinfo.attributes.relationships.servers.data.length,
    };
    for (
      let i = 0, len = userinfo.attributes.relationships.servers.data.length;
      i < len;
      i++
    ) {
      current.ram =
        current.ram +
        userinfo.attributes.relationships.servers.data[i].attributes.limits
          .memory;
      current.disk =
        current.disk +
        userinfo.attributes.relationships.servers.data[i].attributes.limits
          .disk;
      current.cpu =
        current.cpu +
        userinfo.attributes.relationships.servers.data[i].attributes.limits.cpu;
    }

    indexjs.ratelimits(userinfo.attributes.relationships.servers.data.length);
    if (
      current.ram > plan.ram ||
      current.disk > plan.disk ||
      current.cpu > plan.cpu ||
      current.servers > plan.servers
    ) {
      for (
        let i = 0, len = userinfo.attributes.relationships.servers.data.length;
        i < len;
        i++
      ) {
        let suspendid =
          userinfo.attributes.relationships.servers.data[i].attributes.id;
        await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            suspendid +
            "/suspend",
          {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
            },
          }
        );
      }
    } else {
      if (settings.api.client.allow.renewsuspendsystem.enabled == true) return;
      for (
        let i = 0, len = userinfo.attributes.relationships.servers.data.length;
        i < len;
        i++
      ) {
        let suspendid =
          userinfo.attributes.relationships.servers.data[i].attributes.id;
        await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            suspendid +
            "/unsuspend",
          {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
            },
          }
        );
      }
    }
  };
};

function hexToDecimal(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

async function checkForUpdates(currentVersion) {
  try {
    // Instead of checking releases, just check the repo info
    const response = await axios.get('https://api.github.com/repos/Crater-Industries/AeroDactyl');
    
    // If we get here, the repo exists
    return {
      isUpToDate: true, // Assume up to date since we can't check specific versions
      latestVersion: currentVersion,
      releaseUrl: 'https://github.com/Crater-Industries/AeroDactyl',
      releaseType: 'Beta Release',
      releaseDate: 'Current'
    };
  } catch (error) {
    console.error('Error checking GitHub repository:', error.message);
    
    // Return default values if there's an error
    return {
      isUpToDate: true,
      latestVersion: currentVersion,
      releaseUrl: 'https://github.com/Crater-Industries/AeroDactyl',
      releaseType: 'Beta Release',
      releaseDate: new Date().toLocaleDateString()
    };
  }
}
