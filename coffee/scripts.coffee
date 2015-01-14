dropzoneTemplate = """
  <div class="dz-preview dz-file-preview">
    <div class="dz-details">
      <div class="dz-filename"><span data-dz-name></span></div>
      <div class="dz-size" data-dz-size></div>
    </div>
    <div class="dz-progress-container">
      <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
      <span class="dz-progress-percent"></span>
    </div>
    <div class="dz-actions">
      <span data-dz-errormessage class="dz-status">Uploading file...</span>
      <a class="warn" data-dz-remove data-href="cancel" href="#">Cancel</a>
    </div>
  </div>
"""

$ ->

  api = "http://api.transcriptengine.com"
  if document.location.hostname is 'localhost'
    api = "http://localhost:5000"

  # get the stripe key

  $('a[data-href="#main-cta"]').click (e) ->
    mixpanel.track "Clicked main CTA"
    $('html, body').animate({scrollTop: $(".order-form").offset().top}, 500)


  $('a[data-href="dropzone"]').click (e) ->
    mixpanel.track "Clicked to add files"

  $('a[data-reveal-id="urlModal"]').click (e) ->
    mixpanel.track "Clicked to add URLs"


  dropzone = new Dropzone 'a[data-href="dropzone"]',
    paramName: 'asset'
    previewsContainer: '.dz-preview-container'
    previewTemplate: dropzoneTemplate
    createImageThumbnails: false
    url: "#{api}/upload"

  dropzone.on 'processing', () ->
    $('.helper').fadeOut()

  dropzone.on 'removedfile', () ->
    if dropzone.files.length is 0
      $('.helper').fadeIn()
      $('a[data-href="save-files"]').hide()

  # update percentage count
  dropzone.on 'uploadprogress', (file, progress, bytesSent) ->
    $('.dz-progress-percent').text Math.round(progress-1) + "%"

  dropzone.on "complete", (file) ->
    $('.dz-progress-container').fadeOut()

  dropzone.on 'success', (file) ->
    $('.dz-status').text "Upload complete!"
    $('a[data-href="cancel"]').text "Delete file"
    $('a[data-href="save-files"]').fadeIn()
    mixpanel.track "File upload successful"


  # handle adding URLS
  $('a[data-href="saveURL"]').click (e) ->
    do e.preventDefault
    urls = $('textarea#URLs').val()

    $('.helper').hide()
    $('#urlModal').foundation('reveal', 'close')
    $('.added-URLs').html urls
    $('.added-URLs-container').show()
    $('a[data-href="save-files"]').fadeIn()
    mixpanel.track "Added URLs"

  $('a[data-href="delete-URLs"]').click (e) ->
    do e.preventDefault
    $('.added-URLs').html ''
    $('.added-URLs-container').hide()
    if dropzone.files.length is 0
      $('.helper').fadeIn()
      $('a[data-href="save-files"]').hide()

  $('a[data-href="save-files"]').click (e) ->
    urls = $('.addedURLs').text()
    files = []

    if (dropzone.files.length is 0 && urls is "")
      return

    for file in dropzone.files
      files.push file.name

    unless urls is ""
      files.push urls

    window.localStorage['files'] = JSON.stringify(files)
    console.log window.localStorage['files']
    $('a[href="#panel2"]').trigger('click')
    mixpanel.track "Clicked to save files"

  order = 0.00
  price = .99
  hours = 0
  mins = 0
  email = ""

  updateOrderAmt = ->
    hours = parseInt($('.hour-count').val() || 0)
    mins = parseInt($('.min-count').val() || 0)
    order = ((hours * 60) + mins) * price

    if hours.toString().length is 1
      hours = "0" + hours.toString()
    if mins.toString().length is 1
      mins = "0" + mins.toString()

    $('.order-amount').html "$#{order.toFixed(2)}"
    $('.order-description').html "#{hours}:#{mins} of audio to be transcribed at $#{price}/minute"

  $('.hour-count, .min-count').keyup (e) ->
    do updateOrderAmt
    mixpanel.track "Entered transcription time"

  $('.email-addr').keyup (e) ->
    email = $(e.target).val()
    mixpanel.track "Entered email address"


  # STRIPE CHECKOUT --------------------------

  handler = {}

  $.ajax "#{api}/stripeKey",
    method: 'GET'
    success: (key) =>
      handler = StripeCheckout.configure
        key: key
        image: 'images/stripe-img.png'
        token: (token) ->
          # Use the token to create the charge with a server-side script.
          # You can access the token ID with `token.id`
          console.log token.id
          $('a[href="#panel3"]').trigger('click')
          mixpanel.track "Paid successfully"

  $('#checkout').on 'click', (e) ->
    # open Checkout with further options
    mixpanel.track "Clicked to pay"

    handler.open
      name: 'Audio Transcription'
      description: "#{hours} hours, #{mins} mins - $#{order.toFixed(2)}"
      amount: order * 100
      email: email

    do e.preventDefault

  $(window).on 'popstate', () ->
    do handler.close
