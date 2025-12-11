document.addEventListener("DOMContentLoaded", function () {
    const exportBtn = document.getElementById("exportAllAccounts");

    if (exportBtn) {
        exportBtn.addEventListener("click", function () {
            // Lấy từ khóa tìm kiếm nếu có
            const keyword = document.getElementById("searchBox")?.value.trim() || "";

            // Gọi đúng action trong controller (exportAllAccounts)
            const url = `/Admin/Account/exportAllAccounts?keyword=${encodeURIComponent(keyword)}`;

            // Tải file Excel về
            window.location.href = url;
        });
    }
});
