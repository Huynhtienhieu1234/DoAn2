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

                var avatarUrl = (res.data.Avatar && res.data.Avatar !== '' && !res.data.Avatar.includes('Avarta.png')) 
                    ? res.data.Avatar 
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(res.data.HoTen || 'SV') + '&background=2563eb&color=fff&size=150&bold=true';
                
                $('#layoutAvatar').attr('src', avatarUrl);
            }
        },
        error: function () {
            console.warn('Không load được thông tin user cho layout');
        }
    });
}
