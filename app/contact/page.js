import React from 'react'

const page = () => {
  return (
    <div className='contact-hero'>
      <div className="contact-heading">CONTACT US─────</div>
      <div className="contact-mainhero">
        <div className="left-contact"><img src="https://forever-bay.vercel.app/assets/contact_img-CyOum2vk.png" alt="" className="contact-image" /></div>
        <div className="right-contact"><div className="first-line">Our Store</div>
          <div className="second-line">54709 Willms Station <br />
            Suite 350, Washington, USA</div>

            <div className="third-line">
              Tel: (415) 555-0132 <br />
Email: admin@forever.com
            </div>
            <div className="fourth-line">Careers at Forever</div>
            <div className="fifth-line">Learn more about our teams and job openings.</div>
            <div className="sixth-line"><button className='contact-button'>Explore Jobs</button></div>

        </div>


      </div>
    </div>
  )
}

export default page
