$(document).ready(function () {
    loadLayoutUser();
});

function loadLayoutUser() {
    $.ajax({
        url: '/Student/MainSinhVien/GetStudentInfo',
        type: 'GET',
        success: function (res) {
            if (res.success && res.data) {

                $('#layoutUserName').text(res.data.HoTen || 'Sinh viên');

                if (res.data.Avatar && res.data.Avatar !== '') {
                    $('#layoutAvatar').attr('src', res.data.Avatar);
                } else {
                    $('#layoutAvatar').attr('src', '/image/Avarta.png');
                }
            }
        },
        error: function () {
            console.warn('Không load được thông tin user cho layout');
        }
    });
}
