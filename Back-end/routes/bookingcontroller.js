const service = require('./booking.service');

const getAllBookings = async (req, res) => {
try {


const result = await service.getAllBookings(req.query);

res.json(result);


} catch (err) {


res.status(500).json({
  message: err.message
});


}
};

const getBookingById = async (req, res) => {
try {


const booking = await service.getBookingById(
  Number(req.params.id)
);

if (!booking) {
  return res.status(404).json({
    message: 'Không tìm thấy booking'
  });
}

res.json(booking);


} catch (err) {


res.status(500).json({
  message: err.message
});


}
};

const createBooking = async (req, res) => {
try {


const result = await service.createBooking(
  req.body
);

res.status(201).json(result);


} catch (err) {


res.status(400).json({
  message: err.message
});


}
};

const updateStatus = async (req, res) => {
try {

const updated = await service.updateBookingStatus(
  Number(req.params.id),
  Number(req.body.status)
);

// kiểm tra booking tồn tại
if (!updated) {
  return res.status(404).json({
    message: 'Không tìm thấy booking'
  });
}

res.json(updated);


} catch (err) {


res.status(400).json({
  message: err.message
});


}
};

const cancelBooking = async (req, res) => {
try {


const result = await service.cancelBooking(
  Number(req.params.id)
);

res.json(result);


} catch (err) {


res.status(400).json({
  message: err.message
});


}
};

const getStats = async (req, res) => {
try {


const stats = await service.getBookingStats();

res.json(stats);


} catch (err) {


res.status(500).json({
  message: err.message
});


}
};

module.exports = {
getAllBookings,
getBookingById,
createBooking,
updateStatus,
cancelBooking,
getStats
};
