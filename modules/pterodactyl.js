/**
 * 
 *     Aerodactyl 11 (Cactus)
 * 
 */


const loadConfig = require("../handlers/config");
const settings = loadConfig("./config.toml");
const fetch = require("node-fetch");
const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const fs = require("fs");
const getPteroUser = require("../handlers/getPteroUser.js");
const log = require("../handlers/log.js");

if (settings.pterodactyl)
  if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/")
      settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
  }

/* Ensure platform release target is met */
const heliactylModule = { "name": "Pterodactyl", "target_platform": "10.0.0" };

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function (app, db) {
  app.get("/updateinfo", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    const cacheaccount = await getPteroUser(req.session.userinfo.id, db).catch(
      () => {
        return res.send(
          "An error has occured while attempting to update your account information and server list."
        );
      }
    );
    if (!cacheaccount) return;
    req.session.pterodactyl = cacheaccount.attributes;
    if (req.query.redirect)
      if (typeof req.query.redirect == "string")
        return res.redirect("/" + req.query.redirect);
    res.redirect("/servers");
  });

  app.get("/create", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    if (settings.api.client.allow.server.create == true) {
        let redirectlink = theme.settings.redirect.failedcreateserver ?? "/"; // fail redirect link

        const cacheaccount = await getPteroUser(
          req.session.userinfo.id,
          db
        ).catch(() => {
          return res.send(
            "An error has occured while attempting to update your account information and server list."
          );
        });
        if (!cacheaccount) {
          return res.send(
            "Heliactyl failed to find an account on the configured panel, try relogging"
          );
        }
        req.session.pterodactyl = cacheaccount.attributes;

        if (
          req.query.name &&
          req.query.ram &&
          req.query.disk &&
          req.query.cpu &&
          req.query.egg &&
          req.query.location
        ) {
          try {
            decodeURIComponent(req.query.name);
          } catch (err) {
            return res.redirect(`${redirectlink}?err=COULDNOTDECODENAME`);
          }

          let packagename = await db.get("package-" + req.session.userinfo.id);
          let package =
            settings.api.client.packages.list[
              packagename
                ? packagename
                : settings.api.client.packages.default
            ];

          let extra = (await db.get("extra-" + req.session.userinfo.id)) || {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0,
          };

          let ram2 = 0;
          let disk2 = 0;
          let cpu2 = 0;
          let servers2 =
            req.session.pterodactyl.relationships.servers.data.length;
          for (
            let i = 0,
              len = req.session.pterodactyl.relationships.servers.data.length;
            i < len;
            i++
          ) {
            ram2 =
              ram2 +
              req.session.pterodactyl.relationships.servers.data[i].attributes
                .limits.memory;
            disk2 =
              disk2 +
              req.session.pterodactyl.relationships.servers.data[i].attributes
                .limits.disk;
            cpu2 =
              cpu2 +
              req.session.pterodactyl.relationships.servers.data[i].attributes
                .limits.cpu;
          }

          if (servers2 >= package.servers + extra.servers) {
            return res.redirect(`${redirectlink}?err=TOOMUCHSERVERS`);
          }

          let name = decodeURIComponent(req.query.name);
          if (name.length < 1) {
            return res.redirect(`${redirectlink}?err=LITTLESERVERNAME`);
          }
          if (name.length > 191) {
            return res.redirect(`${redirectlink}?err=BIGSERVERNAME`);
          }

          let location = req.query.location;

          if (
            Object.entries(settings.api.client.locations).filter(
              (vname) => vname[0] == location
            ).length !== 1
          ) {
            return res.redirect(`${redirectlink}?err=INVALIDLOCATION`);
          }

          let requiredpackage = Object.entries(
            settings.api.client.locations
          ).filter((vname) => vname[0] == location)[0][1].package;
          if (requiredpackage)
            if (
              !requiredpackage.includes(
                packagename
                  ? packagename
                  : settings.api.client.packages.default
              )
            ) {
              return res.redirect(`../upgrade`);
            }

          let egg = req.query.egg;

          let egginfo = settings.api.client.eggs[egg];
          if (!settings.api.client.eggs[egg]) {
            return res.redirect(`${redirectlink}?err=INVALIDEGG`);
          }
          let ram = parseFloat(req.query.ram);
          let disk = parseFloat(req.query.disk);
          let cpu = parseFloat(req.query.cpu);
          if (!isNaN(ram) && !isNaN(disk) && !isNaN(cpu)) {
            if (ram2 + ram > package.ram + extra.ram) {
              return res.redirect(
                `${redirectlink}?err=EXCEEDRAM&num=${
                  package.ram + extra.ram - ram2
                }`
              );
            }
            if (disk2 + disk > package.disk + extra.disk) {
              return res.redirect(
                `${redirectlink}?err=EXCEEDDISK&num=${
                  package.disk + extra.disk - disk2
                }`
              );
            }
            if (cpu2 + cpu > package.cpu + extra.cpu) {
              return res.redirect(
                `${redirectlink}?err=EXCEEDCPU&num=${
                  package.cpu + extra.cpu - cpu2
                }`
              );
            }
            if (egginfo.minimum.ram)
              if (ram < egginfo.minimum.ram) {
                return res.redirect(
                  `${redirectlink}?err=TOOLITTLERAM&num=${egginfo.minimum.ram}`
                );
              }
            if (egginfo.minimum.disk)
              if (disk < egginfo.minimum.disk) {
                return res.redirect(
                  `${redirectlink}?err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`
                );
              }
            if (egginfo.minimum.cpu)
              if (cpu < egginfo.minimum.cpu) {
                return res.redirect(
                  `${redirectlink}?err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`
                );
              }
            if (egginfo.maximum) {
              if (egginfo.maximum.ram)
                if (ram > egginfo.maximum.ram) {
                  return res.redirect(
                    `${redirectlink}?err=TOOMUCHRAM&num=${egginfo.maximum.ram}`
                  );
                }
              if (egginfo.maximum.disk)
                if (disk > egginfo.maximum.disk) {
                  return res.redirect(
                    `${redirectlink}?err=TOOMUCHDISK&num=${egginfo.maximum.disk}`
                  );
                }
              if (egginfo.maximum.cpu)
                if (cpu > egginfo.maximum.cpu) {
                  return res.redirect(
                    `${redirectlink}?err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`
                  );
                }
            }

            let specs = egginfo.info;
            specs["user"] = await db.get("users-" + req.session.userinfo.id);
            if (!specs["limits"])
              specs["limits"] = {
                swap: 0,
                io: 500,
                backups: 0,
              };
            specs.name = name;
            specs.limits.swap = -1;
            specs.limits.memory = ram;
            specs.limits.disk = disk;
            specs.limits.cpu = cpu;
          	specs.feature_limits.allocations = 25;
            if (!specs["deploy"])
              specs.deploy = {
                locations: [],
                dedicated_ip: false,
                port_range: [],
              };
            specs.deploy.locations = [location];

            let serverinfo = await fetch(
              settings.pterodactyl.domain + "/api/application/servers",
              {
                method: "post",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${settings.pterodactyl.key}`,
                  Accept: "application/json",
                },
                body: JSON.stringify(await specs),
              }
            );
            await serverinfo;
            if (serverinfo.statusText !== "Created") {
              console.log(await serverinfo.text());
              return res.redirect(`${redirectlink}?err=ERRORONCREATE`);
            }
            let serverinfotext = await serverinfo.json();
            let newpterodactylinfo = req.session.pterodactyl;
            newpterodactylinfo.relationships.servers.data.push(serverinfotext);
            req.session.pterodactyl = newpterodactylinfo;

            log(
              "created server",
              `${req.session.userinfo.username} created a new server named \`${name}\` with the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``
            );
            return res.redirect("/servers?err=CREATED");
          } else {
            res.redirect(`${redirectlink}?err=NOTANUMBER`);
          }
        } else {
          res.redirect(`${redirectlink}?err=MISSINGVARIABLE`);
        }
    } else {
      res.redirect(
        theme.settings.redirect.createserverdisabled
          ? theme.settings.redirect.createserverdisabled
          : "/"
      );
    }
  });

  app.get("/modify", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    if (settings.api.client.allow.server.modify == true) {
      if (!req.query.id) return res.send("Missing server id.");

      const cacheaccount = await getPteroUser(
        req.session.userinfo.id,
        db
      ).catch(() => {
        return res.send(
          "An error has occured while attempting to update your account information and server list."
        );
      });
      if (!cacheaccount) return;
      req.session.pterodactyl = cacheaccount.attributes;

      let redirectlink = theme.settings.redirect.failedmodifyserver
        ? theme.settings.redirect.failedmodifyserver
        : "/"; // fail redirect link

      let checkexist =
        req.session.pterodactyl.relationships.servers.data.filter(
          (name) => name.attributes.id == req.query.id
        );
      if (checkexist.length !== 1) return res.send("Invalid server id.");

      let ram = req.query.ram
        ? isNaN(parseFloat(req.query.ram))
          ? undefined
          : parseFloat(req.query.ram)
        : undefined;
      let disk = req.query.disk
        ? isNaN(parseFloat(req.query.disk))
          ? undefined
          : parseFloat(req.query.disk)
        : undefined;
      let cpu = req.query.cpu
        ? isNaN(parseFloat(req.query.cpu))
          ? undefined
          : parseFloat(req.query.cpu)
        : undefined;

      if (ram || disk || cpu) {
        let packagename = await db.get("package-" + req.session.userinfo.id);
        let package =
          settings.api.client.packages.list[
            packagename ? packagename : settings.api.client.packages.default
          ];

        let pterorelationshipsserverdata =
          req.session.pterodactyl.relationships.servers.data.filter(
            (name) => name.attributes.id.toString() !== req.query.id
          );

        let ram2 = 0;
        let disk2 = 0;
        let cpu2 = 0;
        for (
          let i = 0, len = pterorelationshipsserverdata.length;
          i < len;
          i++
        ) {
          ram2 =
            ram2 + pterorelationshipsserverdata[i].attributes.limits.memory;
          disk2 =
            disk2 + pterorelationshipsserverdata[i].attributes.limits.disk;
          cpu2 = cpu2 + pterorelationshipsserverdata[i].attributes.limits.cpu;
        }
        let attemptegg = null;
        //let attemptname = null;

        for (let [name, value] of Object.entries(settings.api.client.eggs)) {
          if (value.info.egg == checkexist[0].attributes.egg) {
            attemptegg = settings.api.client.eggs[name];
            //attemptname = name;
          }
        }
        let egginfo = attemptegg ? attemptegg : null;

        if (!egginfo)
          return res.redirect(
            `${redirectlink}?id=${req.query.id}&err=MISSINGEGG`
          );

        let extra = (await db.get("extra-" + req.session.userinfo.id))
          ? await db.get("extra-" + req.session.userinfo.id)
          : {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0,
            };

        if (ram2 + ram > package.ram + extra.ram)
          return res.redirect(
            `${redirectlink}?id=${req.query.id}&err=EXCEEDRAM&num=${
              package.ram + extra.ram - ram2
            }`
          );
        if (disk2 + disk > package.disk + extra.disk)
          return res.redirect(
            `${redirectlink}?id=${req.query.id}&err=EXCEEDDISK&num=${
              package.disk + extra.disk - disk2
            }`
          );
        if (cpu2 + cpu > package.cpu + extra.cpu)
          return res.redirect(
            `${redirectlink}?id=${req.query.id}&err=EXCEEDCPU&num=${
              package.cpu + extra.cpu - cpu2
            }`
          );
        if (egginfo.minimum.ram)
          if (ram < egginfo.minimum.ram)
            return res.redirect(
              `${redirectlink}?id=${req.query.id}&err=TOOLITTLERAM&num=${egginfo.minimum.ram}`
            );
        if (egginfo.minimum.disk)
          if (disk < egginfo.minimum.disk)
            return res.redirect(
              `${redirectlink}?id=${req.query.id}&err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`
            );
        if (egginfo.minimum.cpu)
          if (cpu < egginfo.minimum.cpu)
            return res.redirect(
              `${redirectlink}?id=${req.query.id}&err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`
            );
        if (egginfo.maximum) {
          if (egginfo.maximum.ram)
            if (ram > egginfo.maximum.ram)
              return res.redirect(
                `${redirectlink}?id=${req.query.id}&err=TOOMUCHRAM&num=${egginfo.maximum.ram}`
              );
          if (egginfo.maximum.disk)
            if (disk > egginfo.maximum.disk)
              return res.redirect(
                `${redirectlink}?id=${req.query.id}&err=TOOMUCHDISK&num=${egginfo.maximum.disk}`
              );
          if (egginfo.maximum.cpu)
            if (cpu > egginfo.maximum.cpu)
              return res.redirect(
                `${redirectlink}?id=${req.query.id}&err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`
              );
        }

        let limits = {
          memory: ram ? ram : checkexist[0].attributes.limits.memory,
          disk: disk ? disk : checkexist[0].attributes.limits.disk,
          cpu: cpu ? cpu : checkexist[0].attributes.limits.cpu,
          swap: egginfo ? checkexist[0].attributes.limits.swap : 0,
          io: egginfo ? checkexist[0].attributes.limits.io : 500,
        };

        let serverinfo = await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            req.query.id +
            "/build",
          {
            method: "patch",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
              Accept: "application/json",
            },
            body: JSON.stringify({
              limits: limits,
              feature_limits: checkexist[0].attributes.feature_limits,
              allocation: checkexist[0].attributes.allocation,
            }),
          }
        );
        if ((await serverinfo.statusText) !== "OK")
          return res.redirect(
            `${redirectlink}?id=${req.query.id}&err=ERRORONMODIFY`
          );
        let text = JSON.parse(await serverinfo.text());
        log(
          `modify server`,
          `${req.session.userinfo.username} modified the server called \`${text.attributes.name}\` to have the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``
        );
        pterorelationshipsserverdata.push(text);
        req.session.pterodactyl.relationships.servers.data =
          pterorelationshipsserverdata;
        let theme = indexjs.get(req);
        adminjs.suspend(req.session.userinfo.id);
        res.redirect("/servers?err=MODIFIED");
      } else {
        res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGVARIABLE`);
      }
    } else {
      res.redirect(
        theme.settings.redirect.modifyserverdisabled
          ? theme.settings.redirect.modifyserverdisabled
          : "/"
      );
    }
  });

  app.get("/delete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    if (!req.query.id) return res.send("Missing id.");
  
    let theme = indexjs.get(req);
  
    if (settings.api.client.allow.server.delete == true) {
      const server = req.session.pterodactyl.relationships.servers.data.find(
        (server) => server.attributes.id == req.query.id
      );
  
      if (!server) {
        return res.redirect("/servers?error=SERVER_NOT_FOUND&errortype=warning");
      }
  
      let deletionresults = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${req.query.id}`,
        {
          method: "delete",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
  
      if (!deletionresults.ok) {
        return res.redirect("/servers?error=SERVER_DELETION_FAILED&errortype=error");
      }
  
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(
        (server) => server.attributes.id.toString() !== req.query.id
      );
      req.session.pterodactyl = pterodactylinfo;
  
      adminjs.suspend(req.session.userinfo.id);
  
      return res.redirect("/servers?success=SERVER_DELETED");
    } else {
      res.redirect(
        theme.settings.redirect.deleteserverdisabled
          ? theme.settings.redirect.deleteserverdisabled
          : "/"
      );
    }
  });
};