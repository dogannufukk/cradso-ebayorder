$(function () {
    var notificationEmails = [];

    // Load settings
    api.get('/Setting/List').done(function (settings) {
        // OTP toggle
        var otp = settings.find(function (s) { return s.key === 'portal.otp.required'; });
        if (otp) $('#otp-toggle').prop('checked', otp.value === 'true');

        // Notification emails
        var emailSetting = settings.find(function (s) { return s.key === 'notification.emails'; });
        if (emailSetting && emailSetting.value) {
            notificationEmails = emailSetting.value.split(',').map(function (e) { return e.trim(); }).filter(function (e) { return e; });
        }
        renderEmailChips();
    });

    // OTP toggle
    $('#otp-toggle').change(function () {
        var val = $(this).is(':checked') ? 'true' : 'false';
        api.put('/Setting/Update', { key: 'portal.otp.required', value: val }).done(function () {
            toast.success('Setting updated');
        });
    });

    // Add email
    function addEmail() {
        var email = $('#new-email-input').val().trim().toLowerCase();
        if (!email) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Invalid email address'); return; }
        if (notificationEmails.indexOf(email) !== -1) { toast.error('Email already added'); return; }

        notificationEmails.push(email);
        saveEmails();
        $('#new-email-input').val('').focus();
    }

    $('#btn-add-email').click(addEmail);
    $('#new-email-input').keypress(function (e) { if (e.which === 13) { e.preventDefault(); addEmail(); } });

    // Remove email
    $(document).on('click', '.btn-remove-email', function () {
        var email = $(this).data('email');
        notificationEmails = notificationEmails.filter(function (e) { return e !== email; });
        saveEmails();
    });

    function saveEmails() {
        var val = notificationEmails.join(',');
        api.put('/Setting/Update', { key: 'notification.emails', value: val }).done(function () {
            toast.success('Notification emails updated');
            renderEmailChips();
        });
    }

    function renderEmailChips() {
        var $container = $('#email-chips');
        if (notificationEmails.length === 0) {
            $container.html('');
            $('#no-emails-msg').removeClass('d-none');
            return;
        }
        $('#no-emails-msg').addClass('d-none');

        var html = '';
        notificationEmails.forEach(function (email) {
            html += '<span class="email-chip">';
            html += '<i class="bi bi-envelope me-1"></i>' + escapeHtml(email);
            html += '<button type="button" class="btn-remove-email" data-email="' + escapeHtml(email) + '"><i class="bi bi-x"></i></button>';
            html += '</span>';
        });
        $container.html(html);
    }
});
