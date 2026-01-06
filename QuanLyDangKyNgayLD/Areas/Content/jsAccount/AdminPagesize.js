document.addEventListener("DOMContentLoaded", function () {
    const pageSizeSelector = document.getElementById("pageSizeSelector");

    if (pageSizeSelector) {
        pageSizeSelector.addEventListener("change", function () {
            const newPageSize = parseInt(this.value, 10);

            // đảm bảo pageSize là biến toàn cục có thể thay đổi
            if (typeof window.pageSize === "undefined") {
                window.pageSize = newPageSize;
            } else {
                window.pageSize = newPageSize;
            }

            // gọi lại loadAccounts nếu đã được định nghĩa
            if (typeof window.loadAccounts === "function") {
                window.loadAccounts(1);
            } else {
                console.error("⚠️ Hàm loadAccounts chưa được định nghĩa hoặc chưa load script Account.js");
            }
        });
    }
});
