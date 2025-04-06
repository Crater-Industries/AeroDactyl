/**
 * 
 *     Aerodactyl 11 (Cactus)
 *     Google OAuth Module
 * 
 */

"use strict";

const loadConfig = require("../handlers/config.js");
const settings = loadConfig("./config.toml");
const fetch = require("node-fetch");
const indexjs = require("../app.js");
const log = require("../handlers/log.js");
const fs = require("fs");
const { renderFile } = require("ejs");
const vpnCheck = require("../handlers/vpnCheck.js");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// URL normalization for callbacks
if (settings.api.client.oauth2.link.slice(-1) == "/")
  settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(0, -1);

if (settings.pterodactyl.domain.slice(-1) == "/")
  settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);

/* Ensure platform release target is met */
const heliactylModule = { "name": "Google OAuth", "target_platform": "10.0.0" };

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function (app, db) {
  // Configure Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: settings.api.client.google.clientId,
    clientSecret: settings.api.client.google.clientSecret,
    callbackURL: settings.api.client.oauth2.link + settings.api.client.google.callback
  }, async function(accessToken, refreshToken, profile, done) {
    try {
      // Check if user exists in database
      const googleId = profile.id;
      const googleUser = await db.get(`google-user-${googleId}`);
      
      if (googleUser) {
        // User exists in our database, but check if they still exist in Pterodactyl
        const pterodactylId = googleUser.pterodactylId;
        
        try {
          // Check if user still exists in Pterodactyl
          const response = await fetch(
            `${settings.pterodactyl.domain}/api/application/users/${pterodactylId}`,
            {
              method: 'get',
                    headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.pterodactyl.key}`
              }
            }
          );
          
          // If user exists in Pterodactyl, continue as normal
          if (response.ok) {
            return done(null, { 
              id: googleUser.id,
              googleId: googleId,
              email: profile.emails[0].value,
              displayName: profile.displayName 
            });
          }
          
          // If we get here, user was deleted from Pterodactyl, so remove from our DB and create new
          await db.delete(`google-user-${googleId}`);
          await db.delete(`users-${googleId}`);
        } catch (error) {
          // Error checking user existence, assume they were deleted
          await db.delete(`google-user-${googleId}`);
          await db.delete(`users-${googleId}`);
        }
      }
      
      // Create new user (either first-time or re-creating after deletion)
      const username = profile.displayName.replace(/\s+/g, '_').toLowerCase() + "_" + makeid(4);
      const email = profile.emails[0].value;
      
      // Create pterodactyl user
      const pterodactylUser = await createPterodactylUser(email, username, profile.displayName);
      
      if (!pterodactylUser || !pterodactylUser.id) {
        return done(new Error("Failed to create Pterodactyl user"));
      }
      
      // Save user to database
      await db.set(`google-user-${googleId}`, {
        id: pterodactylUser.id,
        username: username,
        email: email,
        pterodactylId: pterodactylUser.id
      });
      
      await db.set(`users-${googleId}`, pterodactylUser.id);
      
      // Return new user
      return done(null, { 
        id: googleId,
        googleId: googleId,
        email: email,
        displayName: profile.displayName
      });
          } catch (error) {
      return done(error);
    }
  }));
  
  // Initialize passport
  app.use(passport.initialize());
  
  // Set up session serialization if needed
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });
  
  // Route to initiate Google OAuth
  app.get('/auth/google', function(req, res, next) {
    // Store redirect if provided
    if (req.query.redirect) {
      req.session.redirect = "/" + req.query.redirect;
    }
    
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  });
  
  // Google OAuth callback route
  app.get(settings.api.client.google.callback, passport.authenticate('google', { 
    failureRedirect: '/?error=google_auth_failed'
  }), async function(req, res) {
    try {
      // Get user info from authentication
      const user = req.user;
      
      // Get Pterodactyl ID
      let pterodactylId = await db.get(`users-${user.id}`);
      
      if (!pterodactylId) {
        // First check if a user with this email already exists in Pterodactyl
        try {
          const existingUserResponse = await fetch(
            `${settings.pterodactyl.domain}/api/application/users?include=servers&filter[email]=${encodeURIComponent(user.email)}`,
            {
              method: 'get',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.pterodactyl.key}`
              }
            }
          );
          
          if (existingUserResponse.ok) {
            const existingUsers = await existingUserResponse.json();
            
            if (existingUsers.data && existingUsers.data.length > 0) {
              // Found an existing user with this email
              const existingUser = existingUsers.data[0];
              
              // Link this user to the Google account
              await db.set(`google-user-${user.id}`, {
                id: existingUser.attributes.id,
                username: existingUser.attributes.username,
                email: existingUser.attributes.email,
                pterodactylId: existingUser.attributes.id
              });
              
              await db.set(`users-${user.id}`, existingUser.attributes.id);
              
              // Use this Pterodactyl ID
              pterodactylId = existingUser.attributes.id;
            } else {
              // No existing user, need to create one
              
              // Create new user
              const username = user.displayName.replace(/\s+/g, '_').toLowerCase() + "_" + makeid(4);
              
              // Create pterodactyl user
              const pterodactylUser = await createPterodactylUser(user.email, username, user.displayName);
              
              if (!pterodactylUser || !pterodactylUser.id) {
                return res.redirect('/?error=account_creation_failed&provider=google');
              }
              
              // Save user to database
              await db.set(`google-user-${user.id}`, {
                id: pterodactylUser.id,
                username: username,
                email: user.email,
                pterodactylId: pterodactylUser.id
              });
              
              await db.set(`users-${user.id}`, pterodactylUser.id);
              
              // Now we have a pterodactylId, continue with this
              pterodactylId = pterodactylUser.id;
            }
          } else {
            return res.redirect('/?error=pterodactyl_api_error&provider=google');
          }
        } catch (error) {
          return res.redirect('/?error=pterodactyl_api_error&provider=google');
        }
      }
      
      // Get user details from Pterodactyl API
      const userinfo = await fetch(
        `${settings.pterodactyl.domain}/api/application/users/${pterodactylId}?include=servers`,
        {
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      
      if (userinfo.status !== 200) {
        return res.redirect('/?error=pterodactyl_error&provider=google');
      }
      
      const userinfoData = await userinfo.json();
      
      // Set up session
      req.session.pterodactyl = userinfoData.attributes;
      req.session.userinfo = {
        id: user.id,
        email: user.email,
        username: user.displayName,
        pterodactylId: pterodactylId,
        provider: 'google'
      };
      
      // Store provider type in session
      req.session.authProvider = 'google';
      
      // Generate JWT token if configured
      if (settings.general && settings.general.jwtSecret) {
        const token = jwt.sign(
          {
            id: user.id,
            username: user.displayName,
            email: user.email,
            admin: userinfoData.attributes.root_admin,
            provider: 'google'
          },
          settings.general.jwtSecret,
          { expiresIn: "1h" }
        );

        res.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" || false,
          sameSite: "Strict",
          maxAge: 3600000, // 1 hour
        });
      }

      // Now show the loading screen with direct redirect to dashboard
      res.send(`
<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    #splashText {
      animation: slideDown 0.3s ease-out;
      overflow: hidden;
      white-space: nowrap;
    }
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .custom-spin {
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body class="bg-[#10181e] flex flex-col items-center justify-center min-h-screen">
  <div class="flex flex-col items-center">
    <img src="/assets/spinner.png" class="h-10 w-10 custom-spin">
    <span id="splashText" style="font-family: 'Space Grotesk'" class="mt-6 uppercase text-zinc-400/50 text-sm tracking-widest">Logging you in...</span>
  </div>
  <script>
    var splashTexts = ["Inventing new colors for the rainbow.", "Calculating the meaning of life."];
    function updateSplashText() {
      var randomIndex = Math.floor(Math.random() * splashTexts.length);
      var splashText = splashTexts[randomIndex];
      var splashElement = document.getElementById("splashText");
      splashElement.style.animation = 'none';
      splashElement.offsetHeight;
      splashElement.style.animation = 'slideDown 0.3s ease-out';
      splashElement.textContent = splashText;
    }
    
    // Update splash text periodically
    setInterval(updateSplashText, 1500);
    updateSplashText();
    
    // Redirect after a short delay
    setTimeout(function() {
      window.location.href = '/dashboard';
    }, 2000);
  </script>
</body>
</html>
    `);
  } catch (error) {
    return res.redirect('/?error=auth_error&provider=google');
  }
});
  
  // Helper function to create Pterodactyl user
async function createPterodactylUser(email, username, displayName) {
  try {
    // Generate random password
    const password = makeid(16);
    
    // Ensure username is valid for Pterodactyl (no spaces, certain special characters)
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
    
    // Format names properly
    const firstName = displayName.split(' ')[0] || displayName;
    const lastName = displayName.split(' ').slice(1).join(' ') || '';
    
    // First check if the domain URL is correct
    try {
      const testResponse = await fetch(`${settings.pterodactyl.domain}/api/application/users`, {
        method: 'head',
        headers: {
          'Authorization': `Bearer ${settings.pterodactyl.key}`
        }
      });
      
      if (!testResponse.ok) {
        throw new Error(`API endpoint test failed: ${testResponse.status}`);
      }
    } catch (testError) {
      throw new Error(`Pterodactyl API endpoint is not accessible: ${testError.message}`);
    }
    
    // Create request to Pterodactyl API
    const response = await fetch(
      `${settings.pterodactyl.domain}/api/application/users`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.pterodactyl.key}`
        },
        body: JSON.stringify({
          email: email,
          username: sanitizedUsername,
          first_name: firstName,
          last_name: lastName,
          password: password,
          root_admin: false,
          language: 'en'
        })
      }
    );
    
    // Check if the response is valid JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid response from Pterodactyl API - not JSON");
    }
    
    // Get response body
    const responseData = await response.json();
    
    if (!response.ok) {
      return null;
    }
    
    return responseData.attributes;
  } catch (error) {
    return null;
  }
}

  // Helper function to generate random ID
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
};