(function($, Backbone) {
  var Utils;
  Utils = (function() {
    function Utils() {}

    Utils.getErrorMessage = function(data) {
      if (data.error) {
        return data.error;
      } else if (data.data && data.data.error) {
        return data.data.error;
      }
      return data;
    };

    Utils.getURLParams = function() {
      var key, params, query, raw_vars, v, val, _i, _len, _ref;
      query = window.location.search.substring(1);
      raw_vars = query.split("&");
      params = {};
      for (_i = 0, _len = raw_vars.length; _i < _len; _i++) {
        v = raw_vars[_i];
        _ref = v.split("="), key = _ref[0], val = _ref[1];
        params[key] = decodeURIComponent(val);
      }
      return params;
    };

    return Utils;

  })();
  return window.ClefUtils = Utils;
}).call(this, jQuery, Backbone);

(function($, Backbone) {
  var ConnectTutorialView, SetupTutorialView, SubTutorialView, TutorialView;
  TutorialView = Backbone.View.extend({
    el: $('#clef-tutorial'),
    messageTemplate: _.template("<div class='<%=type%> tutorial-message'><%=message%></div>"),
    events: {
      "click .next": "next",
      "click .previous": "previous",
      "click .done": "done"
    },
    slideClass: 'sub',
    initialize: function(opts) {
      var potentialSubs, sub, _i, _len;
      this.opts = opts;
      if (window.chrome && !window.waltzIsInstalled) {
        this.$el.find('.waltz').addClass(this.slideClass);
        this.$el.addClass('.no-waltz');
      }
      this.subs = [];
      potentialSubs = this.$el.find("." + this.slideClass).filter(this.opts.slideFilterSelector);
      for (_i = 0, _len = potentialSubs.length; _i < _len; _i++) {
        sub = potentialSubs[_i];
        this.subs.push(new SubTutorialView({
          el: sub
        }));
      }
      this.currentSub = this.subs[0];
      $(window).on('message', this.handleMessages.bind(this));
      this.hide();
      return this.render();
    },
    slideUp: function(cb) {
      return this.$el.slideUp(cb);
    },
    hide: function(cb) {
      return this.$el.hide(cb);
    },
    show: function() {
      return this.$el.fadeIn();
    },
    render: function() {
      return this.currentSub.render();
    },
    done: function() {
      return this.trigger("done");
    },
    next: function() {
      var newSub;
      newSub = this.subs[_.indexOf(this.subs, this.currentSub) + 1];
      if (newSub) {
        if (newSub.isLogin() && this.loggedIn) {
          newSub = this.subs[_.indexOf(this.subs, this.newSub) + 1];
        }
        this.currentSub.hide();
        newSub.render();
        this.currentSub = newSub;
        return this.trigger("next");
      } else {
        return this.done();
      }
    },
    previous: function() {
      var newSub;
      newSub = this.subs[_.indexOf(this.subs, this.currentSub) - 1];
      if (newSub) {
        this.currentSub.hide();
        newSub.render();
        return this.currentSub = newSub;
      }
    },
    handleMessages: function(e) {
      if (!e.originalEvent.origin.indexOf(this.opts.clefBase >= 0)) {
        return;
      }
      return e.originalEvent.data;
    },
    connectClefAccount: function(data, cb) {
      var connectData, failure;
      connectData = {
        _wpnonce: this.opts.nonces.connectClef,
        identifier: data.identifier
      };
      failure = (function(_this) {
        return function(msg) {
          return _this.showMessage({
            message: _.template(clefTranslations.messages.error.connect)({
              error: msg
            }),
            type: "error"
          });
        };
      })(this);
      return $.post(this.connectClefAction, connectData).success(function(data) {
        if (data.success) {
          if (typeof cb === "function") {
            return cb(data);
          }
        } else {
          return failure(ClefUtils.getErrorMessage(data));
        }
      }).fail(function(res) {
        return failure(res.responseText);
      });
    },
    showMessage: function(opts) {
      if (this.$currentMessage) {
        this.$currentMessage.remove();
      }
      this.$currentMessage = $(this.messageTemplate(opts)).hide().prependTo(this.$el).slideDown();
      if (opts.removeNext) {
        return this.listenToOnce(this, "next", function() {
          return this.$currentMessage.slideUp();
        });
      }
    }
  }, {
    extend: Backbone.View.extend
  });
  SubTutorialView = Backbone.View.extend({
    initialize: function(opts) {
      this.opts = opts;
      return this.setElement($(this.opts.el));
    },
    render: function() {
      return this.$el.show();
    },
    hide: function() {
      return this.$el.hide();
    },
    remove: function() {
      return this.$el.remove();
    },
    isLogin: function() {
      return this.$el.find('iframe.setup').length;
    }
  });
  SetupTutorialView = TutorialView.extend({
    connectClefAction: ajaxurl + "?action=connect_clef_account_clef_id",
    iframePath: '/iframes/application/create/v1',
    initialize: function(opts) {
      opts.slideFilterSelector = '.setup';
      this.inviter = new InviteUsersView(_.extend({
        el: this.$el.find('.invite-users-container')
      }, opts));
      this.listenTo(this.inviter, "invited", this.usersInvited);
      return this.constructor.__super__.initialize.call(this, opts);
    },
    render: function() {
      if (this.userIsLoggedIn) {
        if (!this.currentSub.$el.hasClass('sync')) {
          this.$el.addClass('no-sync');
        } else {
          this.$el.addClass('user');
        }
      }
      this.loadIFrame();
      this.inviter.render();
      return this.constructor.__super__.render.call(this);
    },
    loadIFrame: function() {
      var src;
      if (this.iframe) {
        return;
      }
      this.iframe = this.$el.find("iframe.setup");
      src = "" + this.opts.clefBase + this.iframePath + "?source=" + (encodeURIComponent(this.opts.setup.source)) + "&domain=" + (encodeURIComponent(this.opts.setup.siteDomain)) + "&logout_hook=" + (encodeURIComponent(this.opts.setup.logoutHook)) + "&name=" + (encodeURIComponent(this.opts.setup.siteName));
      return this.iframe.attr('src', src);
    },
    handleMessages: function(data) {
      data = this.constructor.__super__.handleMessages.call(this, data);
      if (!data) {
        return;
      }
      if (data.type === "keys") {
        return this.connectClefAccount({
          identifier: data.clefID
        }, (function(_this) {
          return function() {
            _this.trigger('applicationCreated', data);
            _this.next();
            return _this.showMessage({
              message: clefTranslations.messages.success.connect,
              type: "updated",
              removeNext: true
            });
          };
        })(this));
      } else if (data.type === "user") {
        this.userIsLoggedIn = true;
        return this.render();
      } else if (data.type === "error") {
        return this.showMessage({
          message: _.template(clefTranslations.messages.error.create)({
            error: data.message
          }),
          type: 'error'
        });
      }
    },
    onConfigured: function() {
      return setTimeout((function() {
        return $(".logout-hook-error").slideDown();
      }), 20000);
    },
    usersInvited: function() {
      this.inviter.hideButton();
      return setTimeout(((function(_this) {
        return function() {
          if (_this.currentSub.$el.hasClass('invite')) {
            return _this.currentSub.$el.find('.button').addClass('button-primary');
          }
        };
      })(this)), 1000);
    }
  });
  ConnectTutorialView = TutorialView.extend({
    connectClefAction: ajaxurl + "?action=connect_clef_account_oauth_code",
    initialize: function(opts) {
      var params;
      this.constructor.__super__.initialize.call(this, opts);
      params = ClefUtils.getURLParams();
      if (params.code) {
        opts.nonces.connectClef = params._wpnonce;
        this.$el.find('.sub:not(.using-clef)').remove();
        return this.connectClefAccount({
          identifier: params.code
        }, (function(_this) {
          return function() {
            return window.location = _this.opts.redirectURL;
          };
        })(this));
      }
    },
    render: function() {
      this.addButton();
      return this.constructor.__super__.render.call(this);
    },
    addButton: function() {
      var target;
      if (this.button) {
        return;
      }
      target = $('#clef-button-target').attr('data-app-id', this.opts.appID).attr('data-redirect-url', this.opts.redirectURL);
      this.button = new ClefButton({
        el: $('#clef-button-target')[0]
      });
      this.button.render();
      return this.button.login = (function(_this) {
        return function(data) {
          _this.button.overlayClose();
          _this.connectClefAccount({
            identifier: data.code
          }, function(result) {
            _this.next();
            return _this.showMessage({
              message: clefTranslations.messages.success.connect,
              type: "updated",
              removeNext: true
            });
          });
          return void 0;
        };
      })(this);
    }
  });
  this.TutorialView = TutorialView;
  this.SetupTutorialView = SetupTutorialView;
  return this.ConnectTutorialView = ConnectTutorialView;
}).call(this, jQuery, Backbone);

(function($, Backbone) {
  var ConnectView;
  ConnectView = Backbone.View.extend({
    el: "#connect-clef-account",
    events: {
      "click #disconnect": "disconnectClefAccount"
    },
    disconnectURL: ajaxurl + "?action=disconnect_clef_account",
    messageTemplate: _.template("<div class='<%=type%> connect-clef-message'><%=message%></div>"),
    initialize: function(opts) {
      this.opts = opts;
      this.tutorial = new ConnectTutorialView(_.clone(this.opts));
      this.disconnect = this.$el.find('.disconnect-clef');
      this.listenTo(this.tutorial, 'done', this.finishTutorial);
      return this.render();
    },
    show: function() {
      return this.$el.fadeIn();
    },
    render: function() {
      this.tutorial.render();
      if (!this.opts.connected) {
        this.disconnect.hide();
        return this.tutorial.show();
      } else {
        this.tutorial.slideUp();
        return this.disconnect.show();
      }
    },
    disconnectClefAccount: function(e) {
      var failure;
      e.preventDefault();
      failure = (function(_this) {
        return function(msg) {
          return _this.showMessage({
            message: _.template(clefTranslations.messages.error.disconnect)({
              error: msg
            }),
            type: "error"
          });
        };
      })(this);
      return $.post(this.disconnectURL, {
        _wpnonce: this.opts.nonces.disconnectClef
      }).success((function(_this) {
        return function(data) {
          var msg;
          if (data.success) {
            _this.opts.connected = false;
            _this.render();
            msg = clefTranslations.messages.success.disconnect;
            return _this.showMessage({
              message: msg,
              type: "updated"
            });
          } else {
            return failure(ClefUtils.getErrorMessage(data));
          }
        };
      })(this)).fail(function(res) {
        return failure(res.responseText);
      });
    },
    showMessage: function(data) {
      if (this.message) {
        this.message.remove();
      }
      this.message = $(this.messageTemplate(data)).hide();
      return this.message.prependTo(this.$el).slideDown();
    },
    finishTutorial: function() {
      return window.location = '';
    }
  });
  return window.ConnectView = ConnectView;
}).call(this, jQuery, Backbone);
