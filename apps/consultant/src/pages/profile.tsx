import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck, Mail, Save, MapPin,
  Briefcase, Users, IndianRupee, Star, Globe, Award,
} from "lucide-react";
import { getAuthUser, setAuthUser } from "@/lib/auth";

const formSchema = z.object({
  name:            z.string().min(2, "Name is required"),
  professionId:    z.string().min(1, "Choose your profession"),
  bio:             z.string().min(10, "Bio must be at least 10 characters"),
  experience:      z.coerce.number().min(0),
  // Shown read-only: the sign-in email is changed by the admin team, not from here
  email:           z.string().optional(),
  location:        z.string().optional(),
});

interface ProfessionOption { id: string; name: string }

/** Lowest price among the plans the therapist offers (plans are managed in the admin panel) */
function lowestPlanPrice(c: any): number {
  const prices = (Array.isArray(c?.services) ? c.services : [])
    .map((s: any) => Number(s?.sessionFee ?? s?.price))
    .filter((p: number) => p > 0);
  if (prices.length) return Math.min(...prices);
  return Number(c?.minPrice) > 0 ? Number(c.minPrice) : 0;
}

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 px-3 sm:px-5 py-3 shrink-0 min-w-0 md:min-w-[110px]">
      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mb-0.5 text-[#450bc8]">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-base font-extrabold text-slate-900 leading-none">{value}</span>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-extrabold uppercase tracking-widest text-[#450bc8]">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const [authUser, setLocalAuthUser] = useState(() => getAuthUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeClientsCount, setActiveClientsCount] = useState<number | null>(null);
  const [dbConsultant, setDbConsultant] = useState<any>(null);
  const [professions, setProfessions] = useState<ProfessionOption[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:            authUser?.name || "",
      professionId:    "",
      email:           authUser?.email || "",
      location:        "",
      bio:             "",
      experience:      0,
    },
  });

  // Fetch real profile and stats from MongoDB Atlas
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const myIdRaw = String(authUser?.id || '').trim();
        const [consultantsRes, myClientsRes, professionsRes] = await Promise.all([
          fetch('/api/consultants').then(r => r.ok ? r.json() : { consultants: [] }).catch(() => ({ consultants: [] })),
          // Active clients = the clients the server lists for this therapist's id (no name matching)
          myIdRaw
            ? fetch(`/api/users?therapistId=${encodeURIComponent(myIdRaw)}`).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
          fetch('/api/professions').then(r => r.ok ? r.json() : { professions: [] }).catch(() => ({ professions: [] })),
        ]);

        const professionList: ProfessionOption[] = (Array.isArray(professionsRes?.professions) ? professionsRes.professions : [])
          .map((p: any) => ({ id: String(p.id || p._id || ''), name: String(p.name || p.serviceName || '') }))
          .filter((p: ProfessionOption) => p.id && p.name);
        setProfessions(professionList);

        const consultantsList = Array.isArray(consultantsRes?.consultants) ? consultantsRes.consultants : [];

        const myEmail = (authUser?.email || '').toLowerCase().trim();
        const myId = myIdRaw.toLowerCase();

        // Match this therapist's own consultant record by id or sign-in email (never by name,
        // which could pick another therapist's record)
        const found = consultantsList.find((c: any) => myId && [c.id, c._id].filter(Boolean).some((v: any) => String(v).toLowerCase().trim() === myId))
          || consultantsList.find((c: any) => myEmail && String(c.email || '').toLowerCase().trim() === myEmail);

        if (found) {
          setDbConsultant(found);
        }

        const myClients = Array.isArray(myClientsRes?.users) ? myClientsRes.users : null;
        setActiveClientsCount(myClients ? myClients.length : null);

        // Populate form with real DB values (`about` is the website's profile text)
        const finalName = found?.name || authUser?.name || "";
        const professionName = String(found?.profession || '').toLowerCase().trim();
        const finalProfessionId = professionList.find(p => p.id === String(found?.professionId || ''))?.id
          || professionList.find(p => p.name.toLowerCase().trim() === professionName)?.id
          || "";
        const finalEmail = found?.email || authUser?.email || "";
        const finalBio = found?.about ?? found?.bio ?? "";
        const finalExp = Number(found?.experienceYears ?? found?.experience) || 0;
        const finalLocation = found?.location || "";

        form.reset({
          name: finalName,
          professionId: finalProfessionId,
          email: finalEmail,
          location: finalLocation,
          bio: finalBio,
          experience: finalExp,
        });
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Save changes directly to MongoDB Atlas
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSaving(true);

      const targetId = dbConsultant?.id || dbConsultant?._id || authUser?.id;

      // Update Consultant document in DB (the Backend stores the text as both about and bio)
      const res = await fetch('/api/consultants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          name: values.name,
          professionId: values.professionId,
          about: values.bio,
          experience: values.experience,
          location: values.location
        })
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || result?.success === false) {
        throw new Error(result?.error || 'Failed to update profile');
      }
      if (result?.consultant) setDbConsultant(result.consultant);

      // Update local storage auth user
      const professionName = professions.find(p => p.id === values.professionId)?.name || authUser?.profession || authUser?.title || '';
      const updatedAuth = {
        ...(authUser || {}),
        name: values.name,
        title: professionName,
        profession: professionName
      };
      setAuthUser(updatedAuth as any);
      setLocalAuthUser(updatedAuth as any);

      toast({
        title: "Profile Updated Successfully ✨",
        description: "Your profile changes have been synchronized with the live database."
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const nameVal = form.watch("name") || authUser?.name || "Therapist";
  const professionIdVal = form.watch("professionId");
  const titleVal = professions.find(p => p.id === professionIdVal)?.name || dbConsultant?.profession || authUser?.profession || authUser?.title || "";
  const emailVal = form.watch("email") || authUser?.email || "";
  const locationVal = form.watch("location") || "";
  const feeVal = lowestPlanPrice(dbConsultant);
  const expVal = form.watch("experience") || 0;
  const specializations: string[] = Array.isArray(dbConsultant?.specializations) ? dbConsultant.specializations : (Array.isArray(dbConsultant?.specialties) ? dbConsultant.specialties : []);
  const languages: string[] = Array.isArray(dbConsultant?.languages) ? dbConsultant.languages : [];

  const initials = nameVal.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const photoUrl = dbConsultant?.photoUrl || dbConsultant?.photo || dbConsultant?.image || authUser?.photoUrl || authUser?.image || authUser?.avatarUrl || "";

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6 font-['Open_Sans']">

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm border-border rounded-3xl bg-white">
        <div className="h-40 bg-gradient-to-r from-[#431bb5] via-[#450bc8] to-[#361394] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        </div>

        <CardContent className="px-4 sm:px-8 pb-0">
          {/* Avatar & Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 mb-6">
            <div className="relative shrink-0 -mt-14">
              <Avatar className="w-28 h-28 border-4 border-white shadow-lg bg-white">
                <AvatarImage src={photoUrl} alt={nameVal} className="object-cover" />
                <AvatarFallback className="text-3xl font-extrabold text-[#450bc8] bg-purple-100">{initials}</AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 pb-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{nameVal}</h1>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 pl-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified Consultant
                </Badge>
                {dbConsultant?.isBookable !== false && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold">
                    Accepting New Clients
                  </Badge>
                )}
              </div>
              <p className="text-slate-600 font-bold">{titleVal}</p>
              <div className="flex flex-wrap gap-4 pt-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {locationVal}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {emailVal}
                </span>
              </div>
            </div>
          </div>

          {/* Real Statistics Strip */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 max-md:[&>*]:border-b max-md:[&>*]:border-r max-md:[&>*]:border-border md:flex md:items-stretch border-t border-border md:divide-x md:divide-border -mx-6 sm:-mx-8 md:overflow-x-auto scrollbar-none">
            <StatPill icon={Briefcase} value={`${expVal}y`} label="Experience" />
            <StatPill icon={Users} value={activeClientsCount === null ? "—" : `${activeClientsCount}`} label="Active Clients" />
            <StatPill icon={IndianRupee} value={feeVal ? `₹${feeVal}` : "—"} label="Per Session" />
            <StatPill icon={Star} value={dbConsultant?.reviewCount ? `${dbConsultant.rating}` : "—"} label={`Rating (${dbConsultant?.reviewCount || 0} reviews)`} />
            <StatPill icon={Globe} value={`${languages.length}`} label="Languages" />
          </div>
        </CardContent>
      </Card>

      {/* ── Main Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Column — Identity Cards */}
        <div className="space-y-5">
          {/* Specializations */}
          <Card className="shadow-sm border-border rounded-3xl bg-white">
            <CardContent className="p-6">
              <SectionHeading>Specializations</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {specializations.length === 0 && (
                  <span className="text-xs text-slate-400">No specializations added yet.</span>
                )}
                {specializations.map((spec, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-[#450bc8] text-xs font-extrabold border border-purple-100">
                    <Award className="w-3 h-3" />{spec}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card className="shadow-sm border-border rounded-3xl bg-white">
            <CardContent className="p-6">
              <SectionHeading>Languages</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {languages.length === 0 && (
                  <span className="text-xs text-slate-400">No languages added yet.</span>
                )}
                {languages.map((lang, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
                    <Globe className="w-3 h-3 text-slate-500" />{lang}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="shadow-sm border-border rounded-3xl bg-white">
            <CardContent className="p-6 space-y-3">
              <SectionHeading>Contact & Location</SectionHeading>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-[#450bc8]">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="truncate">{emailVal}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-[#450bc8]">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{locationVal}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Live Edit Form */}
        <div className="xl:col-span-2 min-w-0">
          <Card className="shadow-sm border-border rounded-3xl bg-white">
            <CardContent className="p-4 sm:p-8">
              <SectionHeading>Edit Profile Details</SectionHeading>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-slate-700">Full Name</FormLabel>
                        <FormControl><Input {...field} className="rounded-xl text-xs h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="professionId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-slate-700">Profession</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl text-xs h-10">
                              <SelectValue placeholder={professions.length ? "Choose your profession" : "No professions available"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {professions.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-slate-700">Official Email</FormLabel>
                        <FormControl><Input {...field} readOnly disabled className="rounded-xl text-xs h-10" /></FormControl>
                        <p className="text-[11px] text-slate-500 font-medium">To change your sign-in email, contact the admin team.</p>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-slate-700">Location / Mode</FormLabel>
                        <FormControl><Input {...field} className="rounded-xl text-xs h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField control={form.control} name="experience" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-slate-700">Years of Experience</FormLabel>
                        <FormControl><Input type="number" {...field} className="rounded-xl text-xs h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Session prices come from the plans set in the admin panel; shown read-only here */}
                    {/* Not a form field, so plain label (FormLabel throws outside <FormField>) */}
                    <div className="space-y-2">
                      <label htmlFor="profile-session-fee" className="text-xs font-extrabold text-slate-700 block">Session Fee (lowest plan, set by admin)</label>
                      <Input id="profile-session-fee" value={feeVal ? `₹${feeVal}` : "No plans yet"} readOnly disabled className="rounded-xl text-xs h-10" />
                    </div>
                  </div>

                  <FormField control={form.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-extrabold text-slate-700">Bio & Overview</FormLabel>
                      <FormControl><Textarea rows={4} {...field} className="rounded-xl text-xs resize-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-[#450bc8] hover:bg-[#3a0aa8] text-white gap-2 px-6 h-11 rounded-xl font-bold text-xs shadow-md shadow-[#450bc8]/20 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "Saving to Database..." : "Save Profile"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
