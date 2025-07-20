import mongoose from "mongoose";
import  dotenv  from "dotenv";
import { dbName } from "./dbName.js";
dotenv.config({path:"./.env"});

const connectDB= async()=>{
        try {
            const connectionInstance= await mongoose.connect(`${process.env.MONGO_DB_URI}/${dbName}`);
            console.log(`database is connected at ${connectionInstance.connection.host}`);
          
            
        } catch (error) {
            console.log(`error in database connection and the error is ${error}`);
            process.exit(1);
            
        }
}
export {connectDB};