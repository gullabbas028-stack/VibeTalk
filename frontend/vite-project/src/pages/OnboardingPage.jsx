import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useAuthUser from "../hooks/userAuthUser.js";
import { completeOnboarding } from "../lib/api.js";

const languages = [
  "English",
  "Spanish",
  "French",
  "Hindi",
  "Arabic",
  "Bengali",
  "Chinese",
  "Japanese",
  "Portuguese",
  "Other",
];

const skills = [
  "Web development",
  "Mobile app development",
  "UI/UX design",
  "Data science",
  "Machine learning",
  "Graphic design",
  "Marketing",
  "Other",
];

const OnboardingPage = () => {
  const { authenticatedUser } = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: authenticatedUser?.fullName ?? "",
    image: authenticatedUser?.image ?? "",
    skill: authenticatedUser?.skill ?? "",
    language: authenticatedUser?.language ?? "",
    location: authenticatedUser?.location ?? "",
    bio: authenticatedUser?.bio ?? "",
  });

  const {
    mutate: onboardingMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/call", { replace: true });
    },
  });

  const handleOnboarding = (event) => {
    event.preventDefault();
    onboardingMutation({
      ...formData,
      fullName: formData.fullName.trim(),
      skill: formData.skill.trim(),
      language: formData.language.trim(),
      location: formData.location.trim(),
      bio: formData.bio.trim(),
    });
  };

  const handleChange = (event) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [event.target.name]: event.target.value,
    }));
  };

  const handleRandomAvatar = () => {
    const seed = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    setFormData((currentFormData) => ({
      ...currentFormData,
      image: `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(seed)}`,
    }));
  };

  return (
    <main className="signup-page">
      <section className="onboarding-card">
        <header className="onboarding-heading">
          <h1>Complete Your Profile</h1>
          <p>Please complete your profile to get started with VibeTalk.</p>
        </header>

        <div className="onboarding-avatar">
          <img
            src={
              formData.image ||
              `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(formData.fullName || "VibeTalk")}`
            }
            alt="Your profile avatar"
          />
          <button
            className="btn btn-info btn-sm"
            type="button"
            onClick={handleRandomAvatar}
          >
            <span aria-hidden="true">⟳</span>
            Generate another
          </button>
        </div>

        <form className="onboarding-form" onSubmit={handleOnboarding}>
          {error && (
            <div className="alert alert-error onboarding-error" role="alert">
              {error.response?.data?.message ||
                "Unable to complete onboarding. Please try again."}
            </div>
          )}

          <div className="onboarding-fields">
            <label className="onboarding-field">
              <span>Full Name</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                placeholder="Your name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </label>

            <label className="onboarding-field">
              <span>Location</span>
              <input
                type="text"
                name="location"
                autoComplete="address-level2"
                placeholder="City, Country"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </label>

            <label className="onboarding-field">
              <span>Language</span>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Pick your language
                </option>
                {formData.language && !languages.includes(formData.language) && (
                  <option value={formData.language}>{formData.language}</option>
                )}
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>

            <label className="onboarding-field">
              <span>Skill</span>
              <select
                name="skill"
                value={formData.skill}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select a skill
                </option>
                {formData.skill && !skills.includes(formData.skill) && (
                  <option value={formData.skill}>{formData.skill}</option>
                )}
                {skills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </label>

            <label className="onboarding-field onboarding-bio">
              <span>Bio</span>
              <textarea
                name="bio"
                placeholder="Tell others about yourself..."
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                required
              />
            </label>
          </div>

          <button
            className="btn onboarding-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending && <span className="loading loading-spinner loading-sm" />}
            {isPending ? "Saving profile..." : "Complete Onboarding"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default OnboardingPage;
