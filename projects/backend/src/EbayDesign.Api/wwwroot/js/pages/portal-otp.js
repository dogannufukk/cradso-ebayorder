$(function () {
    var token = PORTAL_TOKEN;
    var countdown = 60;
    var timer = null;

    // Check if OTP is required
    api.get('/Setting/OtpRequired').done(function (data) {
        if (!data.required) {
            window.location.href = '/Portal/Design/' + token;
            return;
        }
        // Check if already verified
        var verified = sessionStorage.getItem('otp_verified_' + token);
        if (verified) {
            var exp = JSON.parse(verified);
            if (new Date(exp.expiresAt) > new Date()) {
                window.location.href = '/Portal/Design/' + token;
                return;
            }
            sessionStorage.removeItem('otp_verified_' + token);
        }
        requestOtp();
    });

    function requestOtp() {
        api.get('/Portal/RequestOtp?token=' + encodeURIComponent(token)).done(function (data) {
            $('#masked-email').text(data.maskedEmail);
            startCountdown();
            $('.otp-input').eq(0).focus();
        });
    }

    function startCountdown() {
        countdown = 60;
        $('#countdown').text(countdown);
        $('#countdown-area').removeClass('d-none');
        $('#btn-resend').addClass('d-none');
        timer = setInterval(function () {
            countdown--;
            $('#countdown').text(countdown);
            if (countdown <= 0) {
                clearInterval(timer);
                $('#countdown-area').addClass('d-none');
                $('#btn-resend').removeClass('d-none');
            }
        }, 1000);
    }

    $('#btn-resend').click(function () {
        requestOtp();
    });

    // OTP input handling
    var $inputs = $('.otp-input');

    $inputs.on('input', function () {
        var val = $(this).val().replace(/[^0-9]/g, '');
        $(this).val(val);
        if (val && $(this).data('idx') < 5) {
            $inputs.eq($(this).data('idx') + 1).focus();
        }
        checkComplete();
    });

    $inputs.on('keydown', function (e) {
        if (e.key === 'Backspace' && !$(this).val() && $(this).data('idx') > 0) {
            $inputs.eq($(this).data('idx') - 1).focus().val('');
        }
    });

    // Paste support
    $inputs.eq(0).on('paste', function (e) {
        e.preventDefault();
        var pasted = (e.originalEvent.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
        for (var i = 0; i < Math.min(pasted.length, 6); i++) {
            $inputs.eq(i).val(pasted[i]);
        }
        if (pasted.length >= 6) {
            $inputs.eq(5).focus();
            checkComplete();
        } else {
            $inputs.eq(Math.min(pasted.length, 5)).focus();
        }
    });

    function checkComplete() {
        var code = '';
        $inputs.each(function () { code += $(this).val(); });
        if (code.length === 6) {
            verifyOtp(code);
        }
    }

    function verifyOtp(code) {
        $('#otp-error').addClass('d-none');
        $('#otp-loading').removeClass('d-none');
        $inputs.prop('disabled', true);

        api.post('/Portal/VerifyOtp', { token: token, otpCode: code }).done(function (data) {
            if (data.verified) {
                sessionStorage.setItem('otp_verified_' + token, JSON.stringify({ expiresAt: data.expiresAt }));
                window.location.href = '/Portal/Design/' + token;
            } else {
                showError('Invalid code. Please try again.');
                $inputs.val('').prop('disabled', false);
                $inputs.eq(0).focus();
            }
        }).fail(function (xhr) {
            var msg = 'Verification failed';
            if (xhr.responseJSON && xhr.responseJSON.errors) msg = xhr.responseJSON.errors.join(', ');
            else if (xhr.responseJSON && xhr.responseJSON.title) msg = xhr.responseJSON.title;
            showError(msg);
            $inputs.val('').prop('disabled', false);
            $inputs.eq(0).focus();
        }).always(function () {
            $('#otp-loading').addClass('d-none');
        });
    }

    function showError(msg) {
        $('#otp-error').text(msg).removeClass('d-none');
    }
});
