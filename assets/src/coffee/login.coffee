(($) ->
    closeOverlay = ->
        $('.clef-login-form.clef-login-form-embed').addClass 'clef-closed'
    openOverlay = ->
        $('.clef-login-form.clef-login-form-embed').removeClass 'clef-closed'

    $ ->
        $('.close-overlay').click closeOverlay
        $('.open-overlay').click openOverlay
        $('.overlay-info .open').click ->
            $('.overlay-info').removeClass 'closed'


).call this, jQuery