(function() {
  var dropzoneTemplate;

  dropzoneTemplate = "<div class=\"dz-preview dz-file-preview\">\n  <div class=\"dz-details\">\n    <div class=\"dz-filename\"><span data-dz-name></span></div>\n    <div class=\"dz-size\" data-dz-size></div>\n  </div>\n  <div class=\"dz-progress-container\">\n    <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n    <span class=\"dz-progress-percent\"></span>\n  </div>\n  <div class=\"dz-actions\">\n    <span data-dz-errormessage class=\"dz-status\">Uploading file...</span>\n    <a class=\"warn\" data-dz-remove data-href=\"cancel\" href=\"#\">Cancel</a>\n  </div>\n</div>";

  $(function() {
    var api, dropzone, email, handler, hours, mins, order, price, updateOrderAmt;
    api = "http://api.transcriptengine.com";
    if (document.location.hostname === 'localhost') {
      api = "http://localhost:5000";
    }
    $('a[data-href="#main-cta"]').click(function(e) {
      mixpanel.track("Clicked main CTA");
      return $('html, body').animate({
        scrollTop: $(".order-form").offset().top
      }, 500);
    });
    $('a[data-href="dropzone"]').click(function(e) {
      return mixpanel.track("Clicked to add files");
    });
    $('a[data-reveal-id="urlModal"]').click(function(e) {
      return mixpanel.track("Clicked to add URLs");
    });
    dropzone = new Dropzone('a[data-href="dropzone"]', {
      paramName: 'asset',
      previewsContainer: '.dz-preview-container',
      previewTemplate: dropzoneTemplate,
      createImageThumbnails: false,
      url: "" + api + "/upload"
    });
    dropzone.on('processing', function() {
      return $('.helper').fadeOut();
    });
    dropzone.on('removedfile', function() {
      if (dropzone.files.length === 0) {
        $('.helper').fadeIn();
        return $('a[data-href="save-files"]').hide();
      }
    });
    dropzone.on('uploadprogress', function(file, progress, bytesSent) {
      return $('.dz-progress-percent').text(Math.round(progress - 1) + "%");
    });
    dropzone.on("complete", function(file) {
      return $('.dz-progress-container').fadeOut();
    });
    dropzone.on('success', function(file) {
      $('.dz-status').text("Upload complete!");
      $('a[data-href="cancel"]').text("Delete file");
      $('a[data-href="save-files"]').fadeIn();
      return mixpanel.track("File upload successful");
    });
    $('a[data-href="saveURL"]').click(function(e) {
      var urls;
      e.preventDefault();
      urls = $('textarea#URLs').val();
      $('.helper').hide();
      $('#urlModal').foundation('reveal', 'close');
      $('.added-URLs').html(urls);
      $('.added-URLs-container').show();
      $('a[data-href="save-files"]').fadeIn();
      return mixpanel.track("Added URLs");
    });
    $('a[data-href="delete-URLs"]').click(function(e) {
      e.preventDefault();
      $('.added-URLs').html('');
      $('.added-URLs-container').hide();
      if (dropzone.files.length === 0) {
        $('.helper').fadeIn();
        return $('a[data-href="save-files"]').hide();
      }
    });
    $('a[data-href="save-files"]').click(function(e) {
      var file, files, urls, _i, _len, _ref;
      urls = $('.addedURLs').text();
      files = [];
      if (dropzone.files.length === 0 && urls === "") {
        return;
      }
      _ref = dropzone.files;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        files.push(file.name);
      }
      if (urls !== "") {
        files.push(urls);
      }
      window.localStorage['files'] = JSON.stringify(files);
      console.log(window.localStorage['files']);
      $('a[href="#panel2"]').trigger('click');
      return mixpanel.track("Clicked to save files");
    });
    order = 0.00;
    price = .99;
    hours = 0;
    mins = 0;
    email = "";
    updateOrderAmt = function() {
      hours = parseInt($('.hour-count').val() || 0);
      mins = parseInt($('.min-count').val() || 0);
      order = ((hours * 60) + mins) * price;
      if (hours.toString().length === 1) {
        hours = "0" + hours.toString();
      }
      if (mins.toString().length === 1) {
        mins = "0" + mins.toString();
      }
      $('.order-amount').html("$" + (order.toFixed(2)));
      return $('.order-description').html("" + hours + ":" + mins + " of audio to be transcribed at $" + price + "/minute");
    };
    $('.hour-count, .min-count').keyup(function(e) {
      updateOrderAmt();
      return mixpanel.track("Entered transcription time");
    });
    $('.email-addr').keyup(function(e) {
      email = $(e.target).val();
      return mixpanel.track("Entered email address");
    });
    handler = {};
    $.ajax("" + api + "/stripeKey", {
      method: 'GET',
      success: (function(_this) {
        return function(key) {
          return handler = StripeCheckout.configure({
            key: key,
            image: 'images/stripe-img.png',
            token: function(token) {
              console.log(token.id);
              $('a[href="#panel3"]').trigger('click');
              return mixpanel.track("Paid successfully");
            }
          });
        };
      })(this)
    });
    $('#checkout').on('click', function(e) {
      mixpanel.track("Clicked to pay");
      handler.open({
        name: 'Audio Transcription',
        description: "" + hours + " hours, " + mins + " mins - $" + (order.toFixed(2)),
        amount: order * 100,
        email: email
      });
      return e.preventDefault();
    });
    return $(window).on('popstate', function() {
      return handler.close();
    });
  });

}).call(this);
