import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGetClientProfile, useUpdateClientProfile, getGetClientProfileQueryKey } from '@workspace/api-client-react';
import { pageTransition, PageHeader } from '@/components/shared';
import { Camera, User, Mail, Phone, Globe, CalendarHeart, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getClientAuth, setClientAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { data: apiProfile, isLoading } = useGetClientProfile();
  const authUser = getClientAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMutation = useUpdateClientProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The Backend answers { success, user }; the database copy wins over the cached sign-in profile
  const dbProfile: any = (apiProfile as any)?.user || ((apiProfile as any)?.email ? apiProfile : null);
  const dbPhone = (p: any) => p?.phoneNumber || p?.phone || '';
  const dbPhoto = (p: any) => p?.image || p?.avatarUrl || '';

  const displayName = dbProfile?.name || authUser?.name || 'Client';
  const displayEmail = dbProfile?.email || authUser?.email || '';

  const cleanPhone = (val?: string | null) => {
    const s = String(val || '').trim();
    return s === '8940506900' ? '' : s;
  };

  const cleanGender = (val?: string | null) => {
    const g = String(val || '').trim();
    return (g === 'Male' && !authUser?.gender && !dbProfile?.gender) ? '' : g;
  };

  const [avatarUrl, setAvatarUrl] = useState<string>(
    dbPhoto(dbProfile) || authUser?.avatarUrl || ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: dbProfile?.name || authUser?.name || '',
    email: dbProfile?.email || authUser?.email || '',
    phone: cleanPhone(dbPhone(dbProfile) || authUser?.phone),
    age: dbProfile?.age ? String(dbProfile.age) : (authUser?.age ? String(authUser.age) : ''),
    gender: cleanGender(dbProfile?.gender || authUser?.gender),
    preferredLanguage: dbProfile?.preferredLanguage || authUser?.preferredLanguage || 'English'
  });

  useEffect(() => {
    if (dbProfile && !isDirty) {
      const photo = dbPhoto(dbProfile);
      if (photo) setAvatarUrl(photo);
      const next = {
        name: dbProfile.name || authUser?.name || '',
        email: dbProfile.email || authUser?.email || '',
        phone: cleanPhone(dbPhone(dbProfile) || authUser?.phone),
        age: dbProfile.age ? String(dbProfile.age) : (authUser?.age ? String(authUser.age) : ''),
        gender: cleanGender(dbProfile.gender || authUser?.gender),
        preferredLanguage: dbProfile.preferredLanguage || authUser?.preferredLanguage || 'English'
      };
      setFormData(next);

      // Refresh the cached sign-in profile from the database copy
      if (authUser) {
        setClientAuth({
          ...authUser,
          name: next.name,
          email: next.email,
          phone: next.phone,
          age: next.age,
          gender: next.gender,
          preferredLanguage: next.preferredLanguage,
          avatarUrl: photo || authUser.avatarUrl
        });
      }
    }
  }, [apiProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (PNG, JPG, WEBP).",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 600;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = () => resolve(event.target?.result as string);
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setAvatarUrl(dataUrl);

      const targetId = dbProfile?.id || authUser?.id || '';
      const photoRes = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser?.email || formData.email}`
        },
        body: JSON.stringify({
          id: targetId,
          email: formData.email,
          avatarUrl: dataUrl,
          image: dataUrl,
        }),
      });
      if (!photoRes.ok) throw new Error('Photo save failed');

      if (authUser) {
        setClientAuth({
          ...authUser,
          avatarUrl: dataUrl
        });
      }

      queryClient.invalidateQueries({ queryKey: getGetClientProfileQueryKey() });

      toast({
        title: "Photo updated",
        description: "Your new profile photo has been saved to your account.",
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: "Could not save photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const targetId = dbProfile?.id || authUser?.id || '';
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhoneValue = formData.phone.trim();
    // Website (Prisma) reads phoneNumber / image, the panels read phone / avatarUrl: send both
    const payload = {
      id: targetId,
      name: formData.name.trim(),
      email: cleanEmail,
      phone: cleanPhoneValue,
      phoneNumber: cleanPhoneValue,
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      gender: formData.gender,
      preferredLanguage: formData.preferredLanguage,
      avatarUrl: avatarUrl,
      image: avatarUrl
    };

    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser?.email || formData.email}`
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        toast({
          title: "Update Error",
          description: data?.error || "Could not save your profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (authUser) {
        setClientAuth({
          ...authUser,
          name: formData.name,
          email: cleanEmail,
          phone: formData.phone,
          age: formData.age,
          gender: formData.gender,
          preferredLanguage: formData.preferredLanguage,
          avatarUrl: avatarUrl
        });
      }

      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: getGetClientProfileQueryKey() });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved to the database.",
      });
    } catch (err: any) {
      toast({
        title: "Update Error",
        description: "Could not save to database. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !authUser) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <PageHeader title="Profile Settings" />
        <div className="h-96 bg-muted rounded-[24px]"></div>
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="w-full space-y-8 pb-12">
      <PageHeader 
        title="Profile Settings" 
        description="Manage your personal details, contact info, and care preferences." 
      />

      <div className="hex-card">
        {/* Hidden File Input for Avatar Photo */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handlePhotoSelect} 
        />

        {/* Profile Header / Avatar */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 mb-8 border-b border-border">
          <div 
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload profile photo"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold transition-transform group-hover:scale-105">
              {isUploadingPhoto ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>
                  {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'CL'}
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              aria-label="Change photo"
              title="Change profile photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{displayEmail}</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-primary" /> Full Name
              </label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="hex-input w-full"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Mail className="w-4 h-4 text-primary" /> Email Address
              </label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="hex-input w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Phone className="w-4 h-4 text-primary" /> Phone Number
              </label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="hex-input w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <CalendarHeart className="w-4 h-4 text-primary" /> Age
              </label>
              <input 
                type="number" 
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter age"
                className="hex-input w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-primary" /> Gender
              </label>
              <select 
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="hex-input w-full bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Globe className="w-4 h-4 text-primary" /> Preferred Language
              </label>
              <select 
                name="preferredLanguage"
                value={formData.preferredLanguage}
                onChange={handleChange}
                className="hex-input w-full bg-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Mandarin">Mandarin</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving || updateMutation.isPending}
              className="hex-button-primary min-w-[160px]"
            >
              {(isSaving || updateMutation.isPending) ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
