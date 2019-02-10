/*
  Handle synchronization with Google Drive using the realtime API.

  author: Alessio Franceschelli - @alefranz
*/

"use strict";

var Realtime = Realtime || {};

Realtime.Controller = function(view) {
  this.view = view;
  this.uxchecklist = null;
}

Realtime.Controller.prototype.log = function(message) {
  if(document.location.hostname == "localhost") {
    console.log(message);
  }
}

Realtime.Controller.prototype.loaded = function(result) {
  var model = result.getModel();
  this.uxchecklist = model.getRoot().get('uxchecklist');
  this.log(this.uxchecklist);
  this.log(this.uxchecklist.version);

  var self = this;
  this.uxchecklist.checkboxes.addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, function(value){
    self.log(value);
    if (!value.isLocal)
    {
      var key = value.property;
      var val = value.newValue;
      self.log("changed " + key + " as " + val);
      self.view.checkboxes[key].setChecked(val);
    }
  });

  var keys = this.uxchecklist.checkboxes.keys();
  this.log(keys);
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var val = this.uxchecklist.checkboxes.get(key);
    this.log("loaded " + key + " as " + val);
    this.view.checkboxes[key].setChecked(val);
  }
  this.log("ready!");
};

Realtime.Controller.prototype.onCheckBoxChange = function(key) {
  var value = this.view.checkboxes[key].isChecked();
  this.log("saved " + key + " as " + value);
  this.uxchecklist.checkboxes.set(key, value);
};

Realtime.Controller.prototype.start = function() {
  var self = this;
  this.createFile(function (file) {
    gapi.drive.realtime.load(file.id,
      function(r) { self.loaded(r); },
      function(model) { self.initializeModel(model); })
  });
};

Realtime.Controller.prototype.initializeModel = function(model) {
  var uxchecklist = model.create(Realtime.Model.UxCheckList);
  model.getRoot().set('uxchecklist', uxchecklist);
  uxchecklist.version = 1;
  uxchecklist.checkboxes = model.createMap();
  this.log(uxchecklist.version);
  this.save(uxchecklist);
};

Realtime.Controller.prototype.save = function(uxchecklist) {
  uxchecklist = uxchecklist || this.uxchecklist;
  for(var key in this.view.checkboxes) {
    var cb = this.view.checkboxes[key];
    var value = cb.isChecked();
    uxchecklist.checkboxes.set(key, value);
    this.log("saved " + key + " as " + value);
  }
};

Realtime.Controller.prototype.init = function() {
  gapi.drive.realtime.custom.registerType(Realtime.Model.UxCheckList, 'UxCheckList');
  Realtime.Model.UxCheckList.prototype.version = gapi.drive.realtime.custom.collaborativeField('version');
  Realtime.Model.UxCheckList.prototype.checkboxes = gapi.drive.realtime.custom.collaborativeField('checkboxes');
};

Realtime.Controller.prototype.auth = function(immediate, success, fail) {
  var self = this;
  gapi.auth.authorize({
    'client_id': '939842792990-97uqc8rc3h645k65ecd4j7p3u0al17aj.apps.googleusercontent.com',
    'scope': 'https://www.googleapis.com/auth/drive.file email profile',
    'immediate': immediate
  }, function(r) { self.checkAuth(r, success, fail); });
};

Realtime.Controller.prototype.checkAuth = function(authResult, success, fail) {
  if (authResult && !authResult.error) {
    this.log(authResult);
    success();
    this.start();
  } else {
    fail();
  }
};

Realtime.Controller.prototype.createFile = function(callback) {
  var self = this;
  gapi.client.load('drive', 'v2', function () {
    var mimeType = 'application/vnd.google-apps.drive-sdk';
    var title = 'UxCheckList';
    gapi.client.drive.files.list({'q': "title = '" + title + "' and mimeType contains '" + mimeType + "' and trashed = false" })
      .execute(function(r){
        self.log(r);
        if (!r || r.items.length < 1) {
          self.log("create");
          gapi.client.drive.files.insert({
            'resource': {
              mimeType: mimeType,
              title: title
            }
          }).execute(callback);
        } else {
          var file = r.items[0];
          self.log(file);
          callback(file);
        }
      });
  });
};

Realtime.View = function(checkboxes) {
  this.checkboxes = checkboxes;
};

Realtime.Model = Realtime.Model || {};

Realtime.Model.UxCheckList = function () {};

Realtime.Model.CheckBox = function(id, element, isCheckedFn, setCheckedFn) {
  this.id = id;
  this.element = element;
  this.isCheckedFn = isCheckedFn;
  this.setCheckedFn = setCheckedFn;
};

Realtime.Model.CheckBox.prototype.isChecked = function() {
  return this.isCheckedFn(this.id, this.element);
};

Realtime.Model.CheckBox.prototype.setChecked = function(val) {
  this.setCheckedFn(this.id, this.element, val);
};
