"use client";

import React, { useEffect, useState } from "react";
import {
  getUserProfile,
  getUserBookings,
  updateUserProfile,
  cancelBooking,
} from "./action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  image: string | null;
  role: string;
  createdAt: Date;
}

interface Booking {
  id: string;
  status: string;
  createdAt: Date;
  consultant: {
    id: string;
    name: string;
    photoUrl: string | null;
    email: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
    sessionCount: number;
    platform: string;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [profileResult, bookingsResult] = await Promise.all([
      getUserProfile(),
      getUserBookings(),
    ]);
    if (profileResult.success && profileResult.user) {
      setUser(profileResult.user as User);
      setFormData({
        name: profileResult.user.name || "",
        email: profileResult.user.email || "",
        phoneNumber: profileResult.user.phoneNumber || "",
      });
    }

    if (bookingsResult.success && bookingsResult.bookings) {
      setBookings(bookingsResult.bookings as Booking[]);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    const result = await updateUserProfile(formData);

    if (result.success) {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      await loadData();
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to update profile",
      });
    }

    setUpdating(false);
  };

  const openCancelModal = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setCancelModalOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingId) return;

    setCancelling(true);
    const result = await cancelBooking(selectedBookingId);

    if (result.success) {
      setMessage({ type: "success", text: "Booking cancelled successfully" });
      await loadData();
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to cancel booking",
      });
    }

    setCancelling(false);
    setCancelModalOpen(false);
    setSelectedBookingId(null);
  };

  const handleContactUs = () => {
    window.location.href = "tel:+918940506900";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Not Authenticated
          </h1>
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your account and view your bookings
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Profile Information
              </h2>

              {/* Profile Image */}
              {user.image && (
                <div className="flex justify-center mb-6">
                  <img
                    src={user.image}
                    alt={user.name || "Profile"}
                    className="w-24 h-24 rounded-full border-4 border-purple-200"
                  />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    disabled
                  />
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+91 1234567890"
                  />
                </div>

                <div className="pt-2">
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Role:</span> {user.role}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Member since:</span>{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Updating..." : "Update Profile"}
                </button>
              </form>
            </div>
          </div>

          {/* Bookings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                My Bookings
              </h2>

              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No bookings yet
                  </h3>
                  <p className="text-gray-600">
                    Start exploring our services and book a consultation!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {booking.consultant.photoUrl && (
                            <img
                              src={booking.consultant.photoUrl}
                              alt={booking.consultant.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {booking.service.name}
                            </h3>
                            <p className="text-gray-600 mb-1">
                              with{" "}
                              <span className="font-medium">
                                {booking.consultant.name}
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                              <span>₹{booking.service.price}</span>
                              <span>•</span>
                              <span>{booking.service.duration} min</span>
                              <span>•</span>
                              <span>
                                {booking.service.sessionCount} session(s)
                              </span>
                              <span>•</span>
                              <span>{booking.service.platform}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              Booked on{" "}
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                              booking.status,
                            )}`}
                          >
                            {booking.status}
                          </span>

                          {/* Action Buttons */}
                          {booking.status !== "CANCELLED" &&
                            booking.status !== "COMPLETED" && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => openCancelModal(booking.id)}
                                  className="px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-full border border-red-300 hover:bg-red-200 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleContactUs}
                                  className="px-4 py-2 bg-purple-100 text-purple-600 font-semibold rounded-full border border-purple-300 hover:bg-purple-200 transition-colors text-sm"
                                >
                                  Contact Us
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Cancel Booking
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mt-2">
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
            </Button>
            <Button
              onClick={() => setCancelModalOpen(false)}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 font-semibold py-3 rounded-full hover:bg-gray-50"
            >
              No, Keep Booking
            </Button>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-xl text-center">
            <p className="text-sm text-gray-600 mb-2">
              Need help with your booking?
            </p>
            <Link href="tel:+918940506900">
              <p className="font-bold text-purple-700">
                Contact Us: +91 8940506900
              </p>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
