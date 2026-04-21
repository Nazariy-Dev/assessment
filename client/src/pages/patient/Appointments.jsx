import { useEffect, useState } from "react";
import { appointmentService } from "../../services/appointmentService";
import { userService } from "../../services/userService";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Label } from "../../components/Label";
import { format } from "date-fns";
import { Calendar, Clock, User, X } from "lucide-react";

const REQUIRED_FIELDS = [
  "doctor",
  "appointmentDate",
  "appointmentTime",
  "reason",
];

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString().split("T")[0];
};

const validateField = (field, value, currentFormData) => {
  switch (field) {
    case "doctor":
      if (!value) {
        return "Doctor selection is required";
      }
      return "";

    case "appointmentDate": {
      if (!value) {
        return "Date is required";
      }

      const selectedDate = new Date(`${value}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        return "Date must be in the future";
      }
      return "";
    }

    case "appointmentTime": {
      if (!value) {
        return "Time is required";
      }

      const [hours, minutes] = value.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return "Invalid time format";
      }

      const totalMinutes = hours * 60 + minutes;
      const startMinutes = 9 * 60;
      const endMinutes = 17 * 60;

      if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
        return "Time must be during business hours (9:00 AM - 5:00 PM)";
      }
      return "";
    }

    case "reason": {
      const reasonText = value.trim();
      if (!reasonText) {
        return "Reason is required";
      }
      if (reasonText.length < 10) {
        return "Reason field must be at least 10 characters";
      }
      return "";
    }

    default:
      return "";
  }
};

const validateForm = (currentFormData) => {
  const validationErrors = {};

  REQUIRED_FIELDS.forEach((field) => {
    const message = validateField(
      field,
      currentFormData[field],
      currentFormData,
    );
    if (message) {
      validationErrors[field] = message;
    }
  });

  return validationErrors;
};

export const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    doctor: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    symptoms: "",
  });
  const formValidationErrors = validateForm(formData);
  const isFormValid = Object.keys(formValidationErrors).length === 0;

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { appointments: data } = await appointmentService.getAll();
      setAppointments(data);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { users } = await userService.getDoctorsForBooking();
      setDoctors(users);
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setTouched({
      doctor: true,
      appointmentDate: true,
      appointmentTime: true,
      reason: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await appointmentService.create(formData);
      setShowForm(false);
      setSuccessMessage("Appointment booked successfully.");
      alert("Appointment booked successfully.");
      setFormData({
        doctor: "",
        appointmentDate: "",
        appointmentTime: "",
        reason: "",
        symptoms: "",
      });
      setErrors({});
      setTouched({});
      fetchAppointments();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field, value) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);

    if (touched[field]) {
      const fieldError = validateField(field, value, updatedFormData);
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldError = validateField(field, formData[field], formData);
    setErrors((prev) => ({ ...prev, [field]: fieldError }));
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await appointmentService.update(id, { status: "cancelled" });
        fetchAppointments();
      } catch (error) {
        alert(error.response?.data?.message || "Failed to cancel appointment");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground mt-2">
            Manage your medical appointments
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>Book Appointment</Button>
      </div>

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Book New Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor</Label>
                  <select
                    id="doctor"
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.doctor && touched.doctor ? "border-red-500" : "border-input"}`}
                    value={formData.doctor}
                    onChange={(e) =>
                      handleFieldChange("doctor", e.target.value)
                    }
                    onBlur={() => handleFieldBlur("doctor")}
                    required
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}{" "}
                        {doctor.specialization && `- ${doctor.specialization}`}
                      </option>
                    ))}
                  </select>
                  {errors.doctor && touched.doctor && (
                    <p className="text-sm text-red-600">{errors.doctor}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentDate">Date</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) =>
                      handleFieldChange("appointmentDate", e.target.value)
                    }
                    onBlur={() => handleFieldBlur("appointmentDate")}
                    className={
                      errors.appointmentDate && touched.appointmentDate
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                    required
                    min={getTomorrowDate()}
                  />
                  {errors.appointmentDate && touched.appointmentDate && (
                    <p className="text-sm text-red-600">
                      {errors.appointmentDate}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentTime">Time</Label>
                  <Input
                    id="appointmentTime"
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) =>
                      handleFieldChange("appointmentTime", e.target.value)
                    }
                    onBlur={() => handleFieldBlur("appointmentTime")}
                    className={
                      errors.appointmentTime && touched.appointmentTime
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                    required
                  />
                  {errors.appointmentTime && touched.appointmentTime && (
                    <p className="text-sm text-red-600">
                      {errors.appointmentTime}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      handleFieldChange("reason", e.target.value)
                    }
                    onBlur={() => handleFieldBlur("reason")}
                    className={
                      errors.reason && touched.reason
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                    placeholder="Brief reason for visit"
                    required
                  />
                  {errors.reason && touched.reason && (
                    <p className="text-sm text-red-600">{errors.reason}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms (Optional)</Label>
                <textarea
                  id="symptoms"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({ ...formData, symptoms: e.target.value })
                  }
                  placeholder="Describe your symptoms..."
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={!isFormValid || isSubmitting}>
                  {isSubmitting ? "Booking..." : "Book Appointment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setErrors({});
                    setTouched({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No appointments found</p>
            </CardContent>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment._id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">
                        Dr. {appointment.doctor?.name}
                      </span>
                      {appointment.doctor?.specialization && (
                        <span className="text-sm text-muted-foreground">
                          - {appointment.doctor.specialization}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(
                            new Date(appointment.appointmentDate),
                            "MMM dd, yyyy",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.appointmentTime}</span>
                      </div>
                    </div>
                    {appointment.reason && (
                      <p className="text-sm">{appointment.reason}</p>
                    )}
                    {appointment.symptoms && (
                      <p className="text-sm text-muted-foreground">
                        Symptoms: {appointment.symptoms}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                    >
                      {appointment.status}
                    </span>
                    {appointment.status !== "cancelled" &&
                      appointment.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(appointment._id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
