const bcrypt = require("bcrypt");
const bcryptjs = require("bcryptjs");

export const hashPassword = async (unHashedPassword: string): Promise<string> => {
    const saltRounds = 10;
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword: string = await bcrypt.hash(unHashedPassword, salt);
        return hashedPassword;
    } catch {
        return await bcryptjs.hash(unHashedPassword, saltRounds);
    }
};

export const comparePasswords = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    try {
        const passwordsMatch: boolean = await bcrypt.compare(plainPassword, hashedPassword);
        return passwordsMatch;
    } catch {
        try {
            return await bcryptjs.compare(plainPassword, hashedPassword);
        } catch {
            return false;
        }
    }
};
