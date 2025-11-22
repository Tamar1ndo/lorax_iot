function About() {
  const description = `
Decarbonator is a plant-based carbon management dashboard designed to monitor
CO₂ absorption and environmental conditions in indoor spaces. Our system
integrates IoT sensors and data analytics to support sustainable air-quality
improvement and plant health management.
  `;

  const mentors = [
    {
      name: "Prof. Dr. ______ ______",
      role: "Primary Project Mentor",
      department: "Department of Computer Engineering, Kasetsart University",
      email: "professor1@ku.ac.th",
      img: "/prof1.jpg", // put image in /public/
    },
    {
      name: "Asst. Prof. Dr. ______ ______",
      role: "Co-Mentor",
      department: "Department of ________, Kasetsart University",
      email: "professor2@ku.ac.th",
      img: "/prof2.jpg",
    },
  ];

  const members = [
    {
      name: "Pacharamon Putrasreni",
      role: "Frontend / UI Designer",
      img: "/member1.jpg",
    },
    {
      name: "Member 2 Name",
      role: "Backend Developer",
      img: "/member2.jpg",
    },
    {
      name: "Member 3 Name",
      role: "IoT / Hardware",
      img: "/member3.jpg",
    },
    {
      name: "Member 4 Name",
      role: "Data Analyst",
      img: "/member4.jpg",
    },
    {
      name: "Member 5 Name",
      role: "Research / Documentation",
      img: "/member5.jpg",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header same style as Dashboard */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        About Us
      </h1>

      {/* Description Card */}
      <section className="bg-white rounded-2xl shadow-md p-6 space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Project Introduction
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {description}
        </p>
      </section>

      {/* Professor Mentors */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Professor Mentors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mentors.map((prof, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4"
            >
              <img
                src={prof.img}
                alt={prof.name}
                className="w-20 h-20 object-cover rounded-full border"
              />

              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">
                  {prof.name}
                </p>
                <p className="text-sm text-gray-700">{prof.role}</p>
                <p className="text-xs text-gray-500">{prof.department}</p>
                <p className="text-xs text-gray-500">
                  Contact: {prof.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Members */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Team Members
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {members.map((mem, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4"
            >
              <img
                src={mem.img}
                alt={mem.name}
                className="w-16 h-16 object-cover rounded-full border"
              />

              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">
                  {mem.name}
                </p>
                <p className="text-xs text-gray-500">{mem.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default About;
