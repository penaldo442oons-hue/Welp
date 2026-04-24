import { useState } from "react";
import { API_BASE } from "../config/api.js";

function SubmitRequest() {

  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");

  const submitRequest = async (e) => {

    e.preventDefault();

    await fetch(`${API_BASE}/requests`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        name,
        email,
        message
      })
    });

    alert("Request submitted!");

    setName("");
    setEmail("");
    setMessage("");

  };

  return (

    <div style={{padding:40}}>

      <h1>Submit Request</h1>

      <form onSubmit={submitRequest}>

        <div>
          <input
            placeholder="Name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
        </div>

        <br/>

        <div>
          <input
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
        </div>

        <br/>

        <div>
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e)=>setMessage(e.target.value)}
          />
        </div>

        <br/>

        <button type="submit">
          Submit
        </button>

      </form>

    </div>
  );

}

export default SubmitRequest;