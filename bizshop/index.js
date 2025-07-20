import { app } from "./src/app.js";
import { connectDB } from "./src/config/db.js";

connectDB().then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`server is running on port ${process.env.PORT}`);
        
    });
})

