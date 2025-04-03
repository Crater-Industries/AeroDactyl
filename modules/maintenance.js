/**
 * 
 *     Aerodactyl 11 (Cactus)
 *     Maintenance Mode Module
 * 
 */

const fs = require('fs');
const path = require('path');
const loadConfig = require("../handlers/config");
const settings = loadConfig("./config.toml");

/* Ensure platform release target is met */
const heliactylModule = { "name": "Maintenance", "target_platform": "10.0.0" };

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function (app, db) {
  // Check if maintenance settings exist in config
  if (!settings.maintenance) {
    // Add default maintenance settings to config
    settings.maintenance = {
      enabled: false,
      message: "We're currently performing scheduled maintenance. Please check back later.",
      allowAdmins: true
    };
    
    // Save updated config
    try {
      const configPath = path.join(__dirname, '../', 'config.toml');
      const toml = require('@iarna/toml');
      fs.writeFileSync(configPath, toml.stringify(settings));
      console.log('Added maintenance settings to config.toml');
    } catch (error) {
      console.error('Error updating config.toml with maintenance settings:', error);
    }
  }
  
  // Middleware to check maintenance mode - only for protected routes, not the index page
  app.use(async (req, res, next) => {
    // Skip maintenance check for static assets and the index page
    if (req.path === '/' || 
        req.path === '/index' || 
        req.path.startsWith('/assets/') || 
        req.path.startsWith('/css/') || 
        req.path.startsWith('/js/') ||
        req.path === '/api/maintenance/status' ||
        req.path === '/maintenance') {
      return next();
    }
    
    // Read maintenance status from config
    const maintenanceEnabled = settings.maintenance.enabled;
    
    // If maintenance mode is not enabled, continue
    if (!maintenanceEnabled) {
      return next();
    }
    
    // Check if admins are allowed and if the user is an admin
    if (settings.maintenance.allowAdmins && req.session.pterodactyl && req.session.pterodactyl.root_admin) {
      return next();
    }
    
    // Redirect to maintenance page
    return res.redirect('/maintenance');
  });
  
  // Maintenance page route
  app.get('/maintenance', async (req, res) => {
    return res.render('errors/maintenance', {
      settings: settings,
      message: settings.maintenance.message
    });
  });
  
  // API endpoint to check maintenance status
  app.get('/api/maintenance/status', (req, res) => {
    return res.json({
      maintenance: settings.maintenance.enabled,
      message: settings.maintenance.message
    });
  });
};

// Helper function to check if maintenance mode is enabled
module.exports.isMaintenanceEnabled = function() {
  return settings.maintenance && settings.maintenance.enabled;
};

// Helper function to get maintenance message
module.exports.getMaintenanceMessage = function() {
  return settings.maintenance && settings.maintenance.message 
    ? settings.maintenance.message 
    : "We're currently performing scheduled maintenance. Please check back later.";
};
