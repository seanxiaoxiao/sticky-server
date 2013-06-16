var Evernote = require('evernote').Evernote;
var fs = require('fs');
var crypto = require('crypto');

var config = require('../config.json');
var callbackUrl = "http://localhost:3000/oauth_callback";

// home page
exports.list = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    if (req.session.oauthAccessToken) {
        var client = new Evernote.Client({
            consumerKey: config.API_CONSUMER_KEY,
            consumerSecret: config.API_CONSUMER_SECRET,
            sandbox: config.SANDBOX,
            token: req.session.oauthAccessToken
        });
        var noteStore = client.getNoteStore();
        note = noteStore.getNote(req.session.oauthAccessToken, "a5919373-814e-420e-bb83-9d9a1b5bc880", false, true, true, true, function(noteWithResource) {
            console.log(noteWithResource);
            var coupon = noteWithResource.resources[0];
            var res = noteStore.getResourceRecognition(req.session.oauthAccessToken, coupon.guid, function(buffer) {
                console.log(buffer);
            });
            console.log(res);
        });
    }
    res.end();
}

exports.post_note = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    if (req.session.oauthAccessToken) {
        var title = req.param("title");
        var deadline = req.param("deadline");
		var url = req.url;
        var client = new Evernote.Client({
            consumerKey: config.API_CONSUMER_KEY,
            consumerSecret: config.API_CONSUMER_SECRET,
            sandbox: config.SANDBOX,
            token: req.session.oauthAccessToken
        });

        var noteStore = client.getNoteStore();

        var image = fs.readFileSync('enlogo.png');
        var hash = image.toString('base64');
        var data = new Evernote.Data();
        data.size = image.length;
        data.bodyHash = hash;
        data.body = image;
        resource = new Evernote.Resource();
        resource.mime = 'image/png';

        var note = new Evernote.Note();
        note.title = title;
        note.attributes = new Evernote.NoteAttributes();
        note.attributes.reminderOrder = new Date().getTime();
        note.attributes.reminderTime = new Date().getTime() + 3600000 * 24 * 30;
        var image = fs.readFileSync('jackinthebox-coupon.jpg');
        var hash = image.toString('base64');
        var data = new Evernote.Data();
        data.size = image.length;
        data.bodyHash = hash;
        data.body = image;
        resource = new Evernote.Resource();
        resource.mime = 'image/png';
        resource.data = data;

        note.resources = [resource];

        var md5 = crypto.createHash('md5');
        md5.update(image);
        hashHex = md5.digest('hex');

        note.content = '<?xml version="1.0" encoding="UTF-8"?>';
        note.content += '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
        note.content += '<en-note>Here is the Evernote logo:<br/>';
        note.content += '<en-media type="image/png" hash="' + hashHex + '"/>';
        note.content += '</en-note>';

		noteStore.createNote(note, function(createdNote) {
            var guid = createdNote.guid;
            note = noteStore.getNote(req.session.oauthAccessToken, guid, false, true, true, true, function(noteWithResource) {
                var coupon = noteWithResource.resources[0];
                var res = noteStore.getResourceRecognition(req.session.oauthAccessToken, coupon.guid, function(buffer) {
                   console.log(buffer);
                });
                console.log(res);
            });
        });
		
    }
    res.end();
};

exports.index = function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  if(req.session.oauthAccessToken) {
    var token = req.session.oauthAccessToken;
    var client = new Evernote.Client({
      token: token,
      sandbox: config.SANDBOX
    });
    var note_store = client.getNoteStore();
    note_store.listNotebooks(token, function(notebooks){
      req.session.notebooks = notebooks;
      res.render('index');
    });
  } else {
    res.render('index');
  }
};

// OAuth
exports.oauth = function(req, res) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "X-Requested-With");
   var client = new Evernote.Client({
      consumerKey: config.API_CONSUMER_KEY,
      consumerSecret: config.API_CONSUMER_SECRET,
      sandbox: config.SANDBOX
   });


  client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results){
    if(error) {
      req.session.error = JSON.stringify(error);
      res.redirect('/');
    }
    else { 
      // store the tokens in the session
      req.session.oauthToken = oauthToken;
      req.session.oauthTokenSecret = oauthTokenSecret;

      // redirect the user to authorize the token
      res.redirect(client.getAuthorizeUrl(oauthToken));
    }
  });

};

// OAuth callback
exports.oauth_callback = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var client = new Evernote.Client({
        consumerKey: config.API_CONSUMER_KEY,
        consumerSecret: config.API_CONSUMER_SECRET,
        sandbox: config.SANDBOX
    });

  client.getAccessToken(
    req.session.oauthToken, 
    req.session.oauthTokenSecret, 
    req.param('oauth_verifier'), 
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if(error) {
        console.log('error');
        console.log(error);
        res.redirect('/');
      } else {
        // store the access token in the session
        req.session.oauthAccessToken = oauthAccessToken;
        req.session.oauthAccessTtokenSecret = oauthAccessTokenSecret;
        req.session.edamShard = results.edam_shard;
        req.session.edamUserId = results.edam_userId;
        req.session.edamExpires = results.edam_expires;
        req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
        req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;
        req.session.client = client;
        res.redirect('/');
      }
    });
};

// Clear session
exports.clear = function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  req.session.destroy();
  res.redirect('/');
};
