dropzoneTemplate = """
  <div class="dz-preview dz-file-preview">
    <div class="dz-details">
      <div class="dz-filename">
        <i class="fa fa-file-audio-o"></i>
        <span data-dz-name></span>
      </div>
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



  urls = []

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
    mixpanel.track "File upload successful"
    do checkFiles

  $('a[data-href="saveURL"]').click (e) ->
    do e.preventDefault
    unless $('input#URL').val() is ''
      urls.push $('input#URL').val()
    $('#urlModal').foundation('reveal', 'close')
    do refreshURLs

  refreshURLs = () ->
    $('ul.added-URLs').html ''

    for url, index in urls
      $('ul.added-URLs').append """
        <li data-URL-index='#{index}'>
          <span><i class="fa fa-link"></i> #{url}</span>
          <div class="dz-actions">
            <a class="warn" data-href="delete-URL" href="#">Remove</a>
          </div>
        </li>
      """

    $('ul.added-URLs').show()
    do checkFiles
    do deleteHandler

  deleteHandler = ->
    $('a[data-href="delete-URL"]').click (e) ->
      do e.preventDefault
      i = $(e.currentTarget).closest('li').attr('data-URL-index')
      urls.splice(i, 1)
      do refreshURLs

  checkFiles = ->
    if urls.length > 0 or dropzone.files.length > 0
      $('.helper').hide()
      $('a[data-href="save-files"]').show()
    else 
      $('.helper').show()
      $('a[data-href="save-files"]').hide()


  $('a[data-href="back"]').click (e) ->
    $('a[href="#panel1"]').trigger('click')
    

  $('a[data-href="save-files"]').click (e) ->

    files = []

    for file in dropzone.files
      if file.status = 'success'
        files.push file.name

    return if (files.length is 0 and urls.length is 0)

    fileString = ""
    
    for file in files
      fileString += "File: #{file} \n"
    for url in urls
      fileString += "URL: #{url} \n"

    window.localStorage['files'] = fileString
    $('a[href="#panel2"]').trigger('click')

  order = 0.00
  description = ""
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
    $('.order-description').html "#{hours} hours, #{mins} minutes to be transcribed at $#{price}/minute <br> #{window.localStorage['files']}"

  $('.hour-count, .min-count').keyup (e) ->
    do updateOrderAmt
    mixpanel.track "Entered transcription time"

  $('.email-addr').keyup (e) ->
    email = $(e.target).val()
    mixpanel.track "Entered email address"


  # STRIPE CHECKOUT --------------------------

  handler = {}

  handlerSetup = ->
    $.ajax "#{api}/stripeKey",
      method: 'GET'
      success: (key) ->
        handler = StripeCheckout.configure
          key: key
          image: 'images/stripe-img.png'
          token: (token) ->
            $.ajax "#{api}/order",
              method: 'POST'
              data:
                'token': token.id
                'email': email
                'amount': order * 100
                'files': window.localStorage['files']
                'length': "#{hours}:#{mins}"
              success: (response) ->
                $('a[href="#panel3"]').trigger('click')
                mixpanel.track "Paid successfully"

  do handlerSetup

  $('#checkout').on 'click', (e) ->
    # open Checkout with further options
    mixpanel.track "Clicked to pay"

    unless handler?
      do handlerSetup

    handler.open
      name: 'Audio Transcription'
      description: "#{hours} hours, #{mins} mins - $#{order.toFixed(2)}"
      amount: order * 100
      email: email

    do e.preventDefault

  $(window).on 'popstate', () ->
    do handler.close
