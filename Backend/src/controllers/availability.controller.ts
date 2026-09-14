import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
        const dObj = new Date(b.scheduledAt || b.date || b.createdAt || Date.now());
        const dayOfWeek = DAYS_MAP[dObj.getDay()] || 'Monday';
        const dateStr = !isNaN(dObj.getTime()) ? dObj.toISOString().split('T')[0] : (b.date || '2026-08-30');
        const startTime = b.time || (!isNaN(dObj.getTime()) ? dObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '10:00 AM');

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
            if (dayVal?.enabled && Array.isArray(dayVal.slots)) {
              const capDay = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
              dayVal.slots.forEach((ts: any, sIdx: number) => {
                slots.push({
                  id: `SLOT-${therapistId.slice(0, 6)}-${dayKey}-${sIdx}`,
                  therapistId,
                  therapistName: c.name,
                  dayOfWeek: capDay,
                  startTime: ts.start || '09:00 AM',
                  endTime: ts.end || '05:00 PM',
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
          return (cIdStr && sCid.includes(cIdStr)) || (cNameStr && sCname.includes(cNameStr));
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
      const { slotId, clientName, clientEmail, serviceTitle, therapistId, therapistName, date, time } = req.body || {};

      const bookingRecord = {
        id: `BK-${Date.now().toString().slice(-6)}`,
        slotId,
        clientName: clientName || 'Client User',
        clientEmail: clientEmail || '',
        therapistId,
        consultantId: therapistId,
        therapistName,
        consultantName: therapistName,
        serviceTitle: serviceTitle || 'Individual Clinical Psychology',
        date,
        time,
        scheduledAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        amount: 1500,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let slotQuery: any = { id: slotId };
      if (slotId && ObjectId.isValid(slotId)) {
        slotQuery = { $or: [{ id: slotId }, { _id: new ObjectId(slotId) }] };
      }

      await Promise.all([
        db.collection('Booking').insertOne(bookingRecord),
        db.collection('Availability').updateOne(
          slotQuery,
          { $set: { status: 'Booked', clientName, clientEmail, updatedAt: new Date() } }
        ).catch(() => {})
      ]);

      res.json({
        success: true,
        booking: bookingRecord,
        message: 'Client assigned successfully to slot in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to assign client' });
    }
  }

  /**
   * POST /api/admin/availability/toggle-block
   */
  static async toggleBlock(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { slotId, isBlocked, therapistId, therapistName, date, time } = req.body || {};

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
            therapistName,
            date,
            time,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({
        success: true,
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
