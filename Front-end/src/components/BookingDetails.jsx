// Front-end/src/components/BookingDetails.jsx
import React from "react";
import "../pages/Dashboard.css";

export default function BookingDetails({ booking, onClose, onTransition, isAdmin }) {
  if (!booking) return null;

  // Xử lý luồng hiển thị timeline khi có trạng thái Cancelled
  const getTimelineSteps = () => {
    // Nếu booking bị hủy, kiểm tra xem nó bị hủy ở giai đoạn nào
    if (booking.status === 'Cancelled') {
      const wasConfirmed = booking.history && booking.history.some(h => h.status === 'Confirmed');
      if (wasConfirmed) {
        return [
          { label: 'Chờ thanh toán', status: 'Pending', completed: true },
          { label: 'Đã xác nhận', status: 'Confirmed', completed: true },
          { label: 'Đã hủy', status: 'Cancelled', isCancelled: true }
        ];
      } else {
        return [
          { label: 'Chờ thanh toán', status: 'Pending', completed: true },
          { label: 'Đã hủy', status: 'Cancelled', isCancelled: true }
        ];
      }
    }

    // Luồng tiêu chuẩn: Pending -> Confirmed -> In Service -> Completed
    const steps = ['Pending', 'Confirmed', 'In Service', 'Completed'];
    const currentIdx = steps.indexOf(booking.status);
    
    return [
      { label: 'Chờ thanh toán', status: 'Pending', completed: currentIdx >= 0, active: booking.status === 'Pending' },
      { label: 'Đã xác nhận', status: 'Confirmed', completed: currentIdx >= 1, active: booking.status === 'Confirmed' },
      { label: 'Đang rửa xe', status: 'In Service', completed: currentIdx >= 2, active: booking.status === 'In Service' },
      { label: 'Hoàn tất', status: 'Completed', completed: currentIdx >= 3, active: booking.status === 'Completed' }
    ];
  };

  const timelineSteps = getTimelineSteps();
  const completedCount = timelineSteps.filter(s => s.completed && !s.isCancelled).length;
  const totalCompletedWidth = timelineSteps.length > 1 
    ? ((completedCount - 1) / (timelineSteps.length - 1)) * 100 
    : 0;

  // Định dạng hiển thị tiền VNĐ
  const formatPrice = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Định dạng ngày giờ
  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Lấy class badge cho trạng thái
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'badge badge-pending';
      case 'Confirmed': return 'badge badge-confirmed';
      case 'In Service': return 'badge badge-inservice';
      case 'Completed': return 'badge badge-completed';
      case 'Cancelled': return 'badge badge-cancelled';
      default: return 'badge';
    }
  };

  const getPaymentBadgeClass = (status) => {
    switch (status) {
      case 'Unpaid': return 'badge badge-unpaid';
      case 'Paid': return 'badge badge-paid';
      case 'Refunded': return 'badge badge-refunded';
      default: return 'badge';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chi tiết đặt lịch: {booking.id}</h3>
          <button className="btn-close" onClick={onClose} aria-label="Đóng">&times;</button>
        </div>

        <div className="modal-body">
          {/* Timeline tiến trình */}
          <div className="timeline">
            <div className="timeline-progress" style={{ width: `${booking.status === 'Cancelled' ? 100 : totalCompletedWidth}%` }}></div>
            {timelineSteps.map((step, index) => {
              let stepClass = "timeline-step";
              if (step.isCancelled) stepClass += " cancelled";
              else if (step.active) stepClass += " active";
              else if (step.completed) stepClass += " completed";

              return (
                <div key={index} className={stepClass}>
                  <div className="timeline-node"></div>
                  <span className="timeline-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Grid thông tin chi tiết */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Khách hàng</span>
              <span className="detail-value">{booking.customerName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <span className="detail-value">{booking.customerPhone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Loại xe</span>
              <span className="detail-value">{booking.vehicleType === 'CAR' ? '🚗 Ô tô' : '🏍️ Xe máy'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Thời gian rửa xe</span>
              <span className="detail-value">{formatDate(booking.scheduledTime)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gói dịch vụ</span>
              <span className="detail-value">{booking.servicePackage}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tổng thanh toán</span>
              <span className="detail-value">{formatPrice(booking.price)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Máy rửa chỉ định</span>
              <span className="detail-value">{booking.machineId ? `Máy ${booking.machineId}` : 'Chưa gán'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Điểm tích lũy</span>
              <span className="detail-value">+{booking.loyaltyPointsEarned || 0} điểm</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái đặt lịch</span>
              <div>
                <span className={getStatusBadgeClass(booking.status)}>
                  {booking.status === 'Pending' && 'Chờ thanh toán'}
                  {booking.status === 'Confirmed' && 'Đã xác nhận'}
                  {booking.status === 'In Service' && 'Đang rửa xe'}
                  {booking.status === 'Completed' && 'Hoàn thành'}
                  {booking.status === 'Cancelled' && 'Đã hủy'}
                </span>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái thanh toán</span>
              <div>
                <span className={getPaymentBadgeClass(booking.paymentStatus)}>
                  {booking.paymentStatus === 'Unpaid' && 'Chưa thanh toán'}
                  {booking.paymentStatus === 'Paid' && 'Đã thanh toán'}
                  {booking.paymentStatus === 'Refunded' && 'Đã hoàn tiền'}
                  {booking.paymentStatus === 'Cancelled' && 'Hủy giao dịch'}
                </span>
              </div>
            </div>
          </div>

          {/* Lịch sử trạng thái */}
          <div className="logs-section">
            <h4 className="logs-title">Lịch sử hoạt động</h4>
            <div className="logs-list">
              {booking.history && booking.history.map((log, index) => (
                <div key={index} className="log-row">
                  <div className="log-meta">
                    <span className="log-status">
                      {log.status === 'Pending' && 'Khởi tạo đặt lịch'}
                      {log.status === 'Confirmed' && 'Xác nhận đặt lịch'}
                      {log.status === 'In Service' && 'Bắt đầu rửa xe'}
                      {log.status === 'Completed' && 'Hoàn thành dịch vụ'}
                      {log.status === 'Cancelled' && 'Hủy đặt lịch'}
                    </span>
                    <span className="log-note">{log.note}</span>
                  </div>
                  <span className="log-time">{formatDate(log.time)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Các nút chuyển trạng thái cho Admin/Operator */}
          {isAdmin && onTransition && booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
            <div className="action-controls">
              {booking.status === 'Pending' && (
                <>
                  <button 
                    className="btn-action btn-action-confirm" 
                    onClick={() => onTransition(booking.id, 'pay', 'Xác nhận thanh toán thành công')}
                  >
                    💳 Xác nhận thanh toán
                  </button>
                  <button 
                    className="btn-action btn-action-cancel" 
                    onClick={() => onTransition(booking.id, 'cancel', 'Khách hàng yêu cầu hủy đặt lịch')}
                  >
                    Hủy lịch
                  </button>
                </>
              )}

              {booking.status === 'Confirmed' && (
                <>
                  <button 
                    className="btn-action btn-action-confirm" 
                    onClick={() => onTransition(booking.id, 'checkin', 'Khách hàng check-in tại trạm, xe đã đưa vào buồng rửa')}
                  >
                    🚗 Bắt đầu rửa xe (Check-in)
                  </button>
                  <button 
                    className="btn-action btn-action-cancel" 
                    onClick={() => onTransition(booking.id, 'cancel', 'Hủy lịch đặt')}
                  >
                    Hủy lịch
                  </button>
                </>
              )}

              {booking.status === 'In Service' && (
                <button 
                  className="btn-action btn-action-confirm" 
                  onClick={() => onTransition(booking.id, 'complete', 'Chu trình rửa kết thúc thành công, bàn giao xe cho khách')}
                >
                  ✅ Hoàn thành rửa xe
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
