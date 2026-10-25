import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { isAdminUser } from '../middlewares/auth.middleware';
import { BookingInputError, createBooking } from '../services/booking-create';
import { resolveConsultant } from '../services/booking-refs';
import { getDaySlots } from '../services/booking-slots';
import { bookingInstant, isDateLabel, istLabels, weekdayOf } from '../services/booking-time';

const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes: number): string {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm} ${meridiem}`;
}

function generateHourlySlots(startStr: string, endStr: string, stepMinutes = 60): string[] {
  const startMin = parseTimeToMinutes(startStr || '09:00 AM');
  const endMin = parseTimeToMinutes(endStr || '05:00 PM');
  if (startMin >= endMin) return [startStr || '09:00 AM'];

  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += stepMinutes) {
    slots.push(minutesToTimeString(m));
  }
  return slots;
}

export class AvailabilityController {
  /**
   * GET /api/admin/availability and GET /api/availability
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { consultantId, consultantName } = req.query;

      const [bookings, consultants, customSlots] = await Promise.all([
        db.collection('Booking').find({}).toArray(),
        db.collection('Consultant').find({}).toArray(),
        db.collection('Availability').find({}).toArray()
      ]);

      const consultantMap = new Map<string, any>();
      consultants.forEach((c: any) => {
        const id = String(c.id || c._id);
        consultantMap.set(id, c);
        if (c.id) consultantMap.set(String(c.id), c);
        if (c._id) consultantMap.set(String(c._id), c);
        if (c.name) consultantMap.set(c.name.toLowerCase(), c);
      });

      let slots: any[] = [];

      // 1. Transform all MongoDB bookings into availability slots
      bookings.forEach((b: any) => {
        const c = consultantMap.get(String(b.consultantId || b.therapistId)) || consultantMap.get((b.consultantName || '').toLowerCase());
        // Website bookings that are not scheduled yet hold no slot
        const when = bookingInstant(b);
        const labels = when ? istLabels(when) : null;
        const dateStr = (isDateLabel(b.date) ? b.date : null) || labels?.date;
        if (!dateStr) return;
        const dayOfWeek = DAYS_MAP[weekdayOf(dateStr)] || 'Monday';
        const startTime = b.time || labels?.time || '10:00 AM';

        const therapistId = String(c?.id || c?._id || b.consultantId || b.therapistId || '');
        const therapistName = b.consultantName || b.therapistName || c?.name || 'Therapist';

        const isBlocked = b.status === 'BLOCKED' || b.status === 'blocked';
        const isAvailable = b.status === 'AVAILABLE' || b.clientName === 'Open Consultation Slot';

        slots.push({
          id: b.id || String(b._id),
          bookingId: b.id || String(b._id),
          therapistId,
          therapistName,
          dayOfWeek,
          date: dateStr,
          startTime,
          endTime: b.endTime || '11:00 AM',
          durationMinutes: b.durationMinutes || 50,
          status: isBlocked ? 'Blocked' : isAvailable ? 'Available' : 'Booked',
          clientName: isBlocked ? 'Blocked Time Slot' : isAvailable ? 'Open Consultation Slot' : (b.clientName || 'Patient Consultation'),
          clientEmail: b.clientEmail || '',
          serviceType: b.serviceTitle || 'Individual Clinical Psychology',
          sessionType: 'Google Meet',
          meetingUrl: b.meetingLink || b.meetingUrl || 'https://meet.google.com/hex-pert-ify',
          price: b.amount || 1500,
          createdAt: b.createdAt || new Date()
        });
      });

      // 2. Add custom slots from Availability collection
      customSlots.forEach((s: any) => {
        slots.push({
          ...s,
          id: s.id || String(s._id),
          status: s.status || 'Available',
          clientName: s.clientName || (s.status === 'Blocked' ? 'Blocked Time Slot' : 'Open Consultation Slot')
        });
      });

      // 3. For consultants with active availability schedule in MongoDB, generate real recurring configured slots
      consultants.forEach((c: any) => {
        const therapistId = String(c.id || c._id);
        const cSchedule = c.availability;

        if (cSchedule && typeof cSchedule === 'object') {
          Object.entries(cSchedule).forEach(([dayKey, dayVal]: [string, any]) => {
            if (dayVal?.enabled) {
              const capDay = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
              const timeSlotsList = Array.isArray(dayVal.slots) && dayVal.slots.length > 0
                ? dayVal.slots.map((s: any) => s.start || s)
                : generateHourlySlots(dayVal.start || '09:00 AM', dayVal.end || '05:00 PM');

              timeSlotsList.forEach((startTime: string, sIdx: number) => {
                slots.push({
                  id: `SLOT-${therapistId.slice(0, 6)}-${dayKey}-${sIdx}`,
                  therapistId,
                  therapistName: c.name,
                  dayOfWeek: capDay,
                  startTime: startTime,
                  endTime: minutesToTimeString(parseTimeToMinutes(startTime) + 50),
                  durationMinutes: 50,
                  status: 'Available',
                  clientName: 'Open Consultation Slot',
                  sessionType: 'Google Meet',
                  price: c.platformFeePerSession || c.minPrice || 1500
                });
              });
            }
          });
        }
      });

      // Filter by consultant if requested
      if (consultantId || consultantName) {
        const cIdStr = String(consultantId || '').toLowerCase();
        const cNameStr = String(consultantName || '').toLowerCase();
        slots = slots.filter((s) => {
          const sCid = String(s.therapistId || '').toLowerCase();
          const sCname = String(s.therapistName || '').toLowerCase();
          return (cIdStr && sCid === cIdStr) || (cNameStr && sCname.includes(cNameStr));
        });
      }

      res.json({
        success: true,
        count: slots.length,
        slots
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch availability slots' });
    }
  }

  /**
   * POST /api/admin/availability
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const newSlot = {
        id: body.id || `SLOT-${Date.now().toString().slice(-6)}`,
        therapistId: body.therapistId,
        therapistName: body.therapistName,
        dayOfWeek: body.dayOfWeek || 'Monday',
        date: body.date,
        startTime: body.startTime || '10:00 AM',
        endTime: body.endTime || '11:00 AM',
        durationMinutes: body.durationMinutes || 50,
        status: body.status || 'Available',
        clientName: body.clientName || 'Open Consultation Slot',
        clientEmail: body.clientEmail || '',
        sessionType: body.sessionType || 'Google Meet',
        price: body.price || 1500,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Availability').insertOne(newSlot);

      res.status(201).json({
        success: true,
        slot: { ...newSlot, _id: result.insertedId },
        message: 'Slot created successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create slot' });
    }
  }

  /**
   * POST /api/admin/availability/assign
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const { slotId, clientName, clientEmail } = body;

      // Same path as POST /api/bookings: real consultant/client/service ids, server price, both collections, notifications.
      // An assigned slot is unpaid unless the admin records a payment.
      const { booking, duplicate } = await createBooking(
        {
          ...body,
          consultantId: body.consultantId || body.therapistId,
          consultantName: body.consultantName || body.therapistName,
          paymentStatus: body.paymentStatus || 'UNPAID'
        },
        { canSetPayment: isAdminUser(req.user), requireBookable: !isAdminUser(req.user) && !req.isInternal, overrides: slotId ? { slotId } : undefined }
      );

      if (slotId) {
        let slotQuery: any = { id: slotId };
        if (ObjectId.isValid(slotId)) {
          slotQuery = { $or: [{ id: slotId }, { _id: new ObjectId(slotId) }] };
        }
        await db.collection('Availability').updateOne(
          slotQuery,
          { $set: { status: 'Booked', clientName, clientEmail, bookingId: booking?.id, updatedAt: new Date() } }
        ).catch(() => {});
      }

      res.json({
        success: true,
        booking,
        duplicate,
        message: 'Client assigned successfully to slot in MongoDB'
      });
    } catch (error: any) {
      if (error instanceof BookingInputError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error?.message || 'Failed to assign client' });
    }
  }

  /**
   * GET /api/availability/slots?consultantId=&date=YYYY-MM-DD (or consultantEmail=)
   * The consultant's one-hour slots that day in India time: weekly availability minus blocked times
   * (Availability collection) minus the consultant's active bookings. Past slots are unavailable.
   */
  static async getSlots(req: Request, res: Response): Promise<void> {
    try {
      const date = String(req.query.date || '').trim();
      if (!isDateLabel(date)) {
        res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' });
        return;
      }
      const consultant = await resolveConsultant({
        id: req.query.consultantId || req.query.therapistId,
        email: req.query.consultantEmail
      });
      if (!consultant) {
        res.status(404).json({ success: false, error: 'Consultant not found' });
        return;
      }
      const { slots, defaultSchedule } = await getDaySlots(consultant, date);
      res.json({ success: true, consultantId: String(consultant._id), date, defaultSchedule, slots });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch slots' });
    }
  }

  /**
   * POST /api/admin/availability/toggle-block
   */
  static async toggleBlock(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { isBlocked, therapistName, date, time } = req.body || {};
      const therapistId = req.body?.therapistId || req.body?.consultantId;
      // Blocks are keyed per consultant, day and time so a later unblock finds the same record
      const slotId = req.body?.slotId || (therapistId && date ? `BLOCK-${therapistId}-${date}-${String(time || 'all-day').replace(/\s+/g, '')}` : '');
      if (!slotId) {
        res.status(400).json({ success: false, error: 'slotId, or therapistId and date, are required' });
        return;
      }

      const newStatus = isBlocked ? 'Blocked' : 'Available';
      const clientName = isBlocked ? 'Blocked Time Slot' : 'Open Consultation Slot';

      let query: any = { id: slotId };
      if (ObjectId.isValid(slotId)) {
        query = { $or: [{ _id: new ObjectId(slotId) }, { id: slotId }] };
      }

      await db.collection('Availability').updateOne(
        query,
        {
          $set: {
            status: newStatus,
            clientName,
            therapistId,
            consultantId: therapistId,
            therapistName,
            date,
            time,
            updatedAt: new Date()
          },
          $setOnInsert: { id: slotId, createdAt: new Date() }
        },
        { upsert: true }
      );

      res.json({
        success: true,
        slotId,
        status: newStatus,
        message: `Slot ${isBlocked ? 'blocked' : 'unblocked'} successfully`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to toggle slot block status' });
    }
  }

  /**
   * DELETE /api/admin/availability
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Slot ID is required' });
        return;
      }

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await Promise.all([
        db.collection('Availability').deleteOne(query),
        db.collection('Booking').deleteOne(query),
        db.collection('bookings').deleteOne(query)
      ]);

      res.json({
        success: true,
        message: 'Slot removed successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete slot' });
    }
  }
}
