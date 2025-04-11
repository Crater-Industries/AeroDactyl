/**
 * 
 *     Aerodactyl 11 (Cactus)
 * 
 */


const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const loadConfig = require("../handlers/config");
const settings = loadConfig("./config.toml");
const fs = require("fs");
const ejs = require("ejs");
const log = require("../handlers/log.js");
const moment = require('moment');

const REWARD_AMOUNT = 150;
const DAY_IN_MILLISECONDS = 86400000;

/* Ensure platform release target is met */
const heliactylModule = { "name": "Resources Store", "target_platform": "10.0.0" };

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function (app, db) {
  // Define packages from config
  const packages = [];
  
  // Check if packages configuration exists
  if (settings.api.client.coins.store.packages) {
    // Convert config packages to array format
    for (const [id, pkg] of Object.entries(settings.api.client.coins.store.packages)) {
      packages.push({
        id,
        name: pkg.name,
        description: pkg.description,
        resources: {
          ram: pkg.ram,
          cpu: pkg.cpu,
          disk: pkg.disk,
          servers: pkg.servers
        },
        cost: pkg.cost,
        highlight: pkg.highlight || false
      });
    }
  }

  // Helper function to check resource limits
  async function checkResourceLimits(userId, type, amount, db) {
    const currentExtra = (await db.get(`extra-${userId}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    const { per } = settings.api.client.coins.store[type];
    const additionalAmount = per * amount;
    const newTotal = currentExtra[type] + additionalAmount;

    // Get maximum allowed from config
    const maxAllowed = settings.resources[type];

    return newTotal <= maxAllowed;
  }

  // Package purchase endpoint
  app.get("/buy-package", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let settings = await enabledCheck(req, res);
    if (!settings) return;

    const { id } = req.query;
    if (!id) return res.send("Missing package ID");

    // Find the package
    const pkg = packages.find(p => p.id === id);
    if (!pkg) return res.send("Invalid package ID");

    const theme = indexjs.get(req);
    const failedCallbackPath = theme.settings.redirect.failedpurchaseram || "/";

    // Check resource limits for each resource type
    const userId = req.session.userinfo.id;
    for (const [type, amount] of Object.entries(pkg.resources)) {
      if (amount > 0) {
        const withinLimits = await checkResourceLimits(userId, type, amount, db);
        if (!withinLimits) {
          return res.redirect(`${failedCallbackPath}?err=RESOURCELIMIT`);
        }
      }
    }

    // Check if user can afford the package
    const userCoins = (await db.get(`coins-${userId}`)) || 0;
    if (userCoins < pkg.cost) {
      return res.redirect(`${failedCallbackPath}?err=CANNOTAFFORD`);
    }

    // Deduct coins
    const newUserCoins = userCoins - pkg.cost;
    if (newUserCoins === 0) {
      await db.delete(`coins-${userId}`);
    } else {
      await db.set(`coins-${userId}`, newUserCoins);
    }

    // Add resources
    const resources = pkg.resources;
    let extra = (await db.get(`extra-${userId}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    // Process each resource type
    for (const [type, amount] of Object.entries(resources)) {
      if (amount > 0) {
        // Update resource cap
        const resourceCap = (await db.get(`${type}-${userId}`)) || 0;
        const newResourceCap = resourceCap + amount;
        await db.set(`${type}-${userId}`, newResourceCap);

        // Update extra resources
        const { per } = settings.api.client.coins.store[type];
        extra[type] += per * amount;
      }
    }

    // Save extra resources
    if (Object.values(extra).every((v) => v === 0)) {
      await db.delete(`extra-${userId}`);
    } else {
      await db.set(`extra-${userId}`, extra);
    }

    // Suspend to apply changes
    adminjs.suspend(userId);

    // Log the purchase
    log(
      `Package Purchased`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought the ${pkg.name} package for \`${pkg.cost}\` coins.`
    );

    // Redirect
    res.redirect(
      (theme.settings.redirect.purchaseram
        ? theme.settings.redirect.purchaseram
        : "/") + "?err=none"
    );
  });

  // Original buy endpoint
  app.get("/buy", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let settings = await enabledCheck(req, res);
    if (!settings) return;

    const { type, amount } = req.query;
    if (!type || !amount) return res.send("Missing type or amount");

    const validTypes = ["ram", "disk", "cpu", "servers"];
    if (!validTypes.includes(type)) return res.send("Invalid type");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 10)
      return res.send("Amount must be a number between 1 and 10");

    const theme = indexjs.get(req);
    const failedCallbackPath =
      theme.settings.redirect[`failedpurchase${type}`] || "/";

    const userId = req.session.userinfo.id;

    // Check resource limits
    const withinLimits = await checkResourceLimits(userId, type, parsedAmount, db);
    if (!withinLimits) {
      return res.redirect(`${failedCallbackPath}?err=RESOURCELIMIT`);
    }

    const userCoins = (await db.get(`coins-${userId}`)) || 0;
    const resourceCap = (await db.get(`${type}-${userId}`)) || 0;

    const { per, cost } = settings.api.client.coins.store[type];
    const purchaseCost = cost * parsedAmount;

    if (userCoins < purchaseCost)
      return res.redirect(`${failedCallbackPath}?err=CANNOTAFFORD`);

    const newUserCoins = userCoins - purchaseCost;
    const newResourceCap = resourceCap + parsedAmount;
    const extraResource = per * parsedAmount;

    if (newUserCoins === 0) {
      await db.delete(`coins-${userId}`);
      await db.set(`${type}-${userId}`, newResourceCap);
    } else {
      await db.set(`coins-${userId}`, newUserCoins);
      await db.set(`${type}-${userId}`, newResourceCap);
    }

    let extra = (await db.get(`extra-${userId}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    extra[type] += extraResource;

    if (Object.values(extra).every((v) => v === 0)) {
      await db.delete(`extra-${userId}`);
    } else {
      await db.set(`extra-${userId}`, extra);
    }

    adminjs.suspend(userId);

    log(
      `Resources Purchased`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${extraResource} ${type} from the store for \`${purchaseCost}\` coins.`
    );

    res.redirect(
      (theme.settings.redirect[`purchase${type}`]
        ? theme.settings.redirect[`purchase${type}`]
        : "/") + "?err=none"
    );
  });
  
  app.post('/claim-reward', async (req, res) => {
    if (!req.session.pterodactyl) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.userinfo.id;
    const lastClaim = await db.get(`last-claim-${userId}`);

    if (lastClaim && new Date() - new Date(lastClaim) < DAY_IN_MILLISECONDS) {
        return res.status(403).send('Reward already claimed today.');
    }

    await db.set(`last-claim-${userId}`, new Date().toISOString());
    let usercoins = await db.get("coins-" + req.session.userinfo.id);
    usercoins = usercoins ? usercoins : 0;
    // Adjust the increment based on the user package
    usercoins = usercoins + settings.api.client.coins.dailyReward
    await db.set("coins-" + req.session.userinfo.id, usercoins);

    res.redirect('../dashboard?err=CLAIMED')
  });

  app.get('/reward-status', async (req, res) => {
    if (!req.session.pterodactyl) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.userinfo.id;
    const lastClaim = await db.get(`last-claim-${userId}`);

    if (!lastClaim) {
        return res.json({ claimable: true, nextClaimIn: null });
    }

    const timePassed = new Date() - new Date(lastClaim);
    if (timePassed >= DAY_IN_MILLISECONDS) {
        return res.json({ claimable: true, nextClaimIn: null });
    } else {
        const nextClaimIn = DAY_IN_MILLISECONDS - timePassed;
        return res.json({ claimable: false, nextClaimIn });
    }
  });

  // Add resource limits check endpoint
  app.get('/check-resource-limits', async (req, res) => {
    if (!req.session.pterodactyl) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.session.userinfo.id;
    const currentExtra = (await db.get(`extra-${userId}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    const limits = {
      ram: currentExtra.ram >= settings.resources.ram,
      disk: currentExtra.disk >= settings.resources.disk,
      cpu: currentExtra.cpu >= settings.resources.cpu,
      servers: currentExtra.servers >= settings.resources.servers,
      current: currentExtra,
      max: settings.resources
    };

    res.json(limits);
  });

  async function enabledCheck(req, res) {
    if (settings.api.client.coins.store.enabled) return settings;

    const theme = indexjs.get(req);
    ejs.renderFile(
      `./views/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `App ― An error has occurred on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send(
            "An error has occurred while attempting to load this page. Please contact an administrator to fix this."
          );
        }
        res.status(200);
        res.send(str);
      }
    );
    return null;
  }
};
