

import { GoogleGenAI, Type } from "@google/genai";
import { Class, Trainee, Unit, WeeklyTrainerReportData, WeeklyTraineeReportData } from "../types";

// Initialize the Google Gemini AI client. Assumes API_KEY is in process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates a concise summary for a trainee attendance record.
 * @param cls The class for which attendance was taken.
 * @param unit The unit taught during the session.
 * @param presentTrainees An array of trainees who were present.
 * @param absentTrainees An array of trainees who were absent.
 * @param date The date of the attendance.
 * @param time The time of the attendance.
 * @returns An AI-generated summary string.
 */
export const generateTraineeAttendanceSummary = async (
  cls: Class,
  unit: Unit,
  presentTrainees: Trainee[],
  absentTrainees: Trainee[],
  date: string,
  time: string
): Promise<string> => {
  const absentNames = absentTrainees.map(t => t.name).join(', ') || 'None';
  const totalTrainees = presentTrainees.length + absentTrainees.length;
  
  const prompt = `
    Generate a concise, one-paragraph attendance summary for a professional report.
    The tone should be formal and informative.
    Do not use markdown or special formatting.
    
    Here is the data:
    - Class: ${cls.name}
    - Unit Taught: ${unit.name}
    - Date: ${date}
    - Time: ${time}
    - Total Trainees: ${totalTrainees}
    - Present: ${presentTrainees.length}
    - Absent: ${absentTrainees.length}
    - List of Absent Trainees: ${absentNames}

    Example Output:
    On ${date} at ${time}, an attendance check was conducted for the "${cls.name}" class during the "${unit.name}" unit. Out of ${totalTrainees} trainees, ${presentTrainees.length} were present. The ${absentTrainees.length} absent trainees were: ${absentNames}.
    
    Now, generate the summary based on the provided data.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    // Fallback to a non-AI summary in case of API error
    return `Attendance for ${cls.name} on ${date} for unit ${unit.name} recorded. Present: ${presentTrainees.length}, Absent: ${absentTrainees.length}. Absent trainees: ${absentNames}.`;
  }
};

/**
 * Generates a confirmation message for a class rep's weekly submission.
 * @returns A simple confirmation string.
 */
export const generateWeeklyScheduleSubmissionSummary = async (clsName: string, week: string): Promise<string> => {
  const prompt = `Generate a very brief, professional confirmation message for a class representative who just submitted the weekly trainer attendance log. Class: "${clsName}", Week: "${week}". Tone: formal, reassuring.`;
  try {
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Error generating weekly submission summary:", error);
    return `Thank you. The weekly attendance log for ${clsName} for week ${week} has been successfully submitted.`;
  }
};

/**
 * Generates simulated weekly trainer report data using AI.
 * @param cls The class for the report.
 * @param units The units available for the class.
 * @returns A structured data object for the trainer report.
 */
export const generateWeeklyTrainerReportData = async (cls: Class, units: Unit[]): Promise<WeeklyTrainerReportData> => {
  const prompt = `
    You are a college registrar creating a plausible, simulated weekly schedule for a trainer.
    The output must be a valid JSON object. Do not include any markdown formatting like \`\`\`json.
    - Class: "${cls.name}"
    - Trainer: Assume the assigned trainer for the class.
    - Units: ${units.map(u => `"${u.name}"`).join(', ')}.
    - Time Slots: "08:00-10:00", "10:00-12:00", "12:00-13:00", "13:00-15:00", "15:00-17:00".
    - Statuses: "Taught", "Not Taught", "Assignment".
    - Dates: Provide plausible dates for a recent week.

    Fill in a schedule for Monday to Friday. Not all slots need to be filled.
    Vary the units and statuses to create a realistic schedule.
  `;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            schedule: {
                type: Type.OBJECT,
                properties: {
                    monday: { type: Type.OBJECT },
                    tuesday: { type: Type.OBJECT },
                    wednesday: { type: Type.OBJECT },
                    thursday: { type: Type.OBJECT },
                    friday: { type: Type.OBJECT },
                }
            },
            dates: {
                type: Type.OBJECT,
                properties: {
                    monday: { type: Type.STRING },
                    tuesday: { type: Type.STRING },
                    wednesday: { type: Type.STRING },
                    thursday: { type: Type.STRING },
                    friday: { type: Type.STRING },
                }
            }
        }
      }
    },
  });
  
  return JSON.parse(response.text) as WeeklyTrainerReportData;
};

/**
 * Generates simulated weekly trainee report data using AI.
 * @param trainees The list of trainees in the class.
 * @returns A structured data object for the trainee report.
 */
export const generateWeeklyTraineeReportData = async (trainees: Trainee[]): Promise<WeeklyTraineeReportData> => {
    const traineeNames = trainees.map(t => t.name);
    const prompt = `
        You are a quality assurance officer simulating a weekly attendance report for a class of trainees.
        The output must be a valid JSON object. Do not include any markdown formatting like \`\`\`json.
        Trainees: ${traineeNames.join(', ')}.
        Statuses: "Present", "Absent".
        
        For each trainee, generate a daily attendance status (mon-fri) and a final weekly attendance percentage.
        Then, provide a summary with overall percentage, lists of perfect and low (<80%) attendance students, and a brief recommendation.
        Make the data look realistic, with most students present most of the time, but include a few absences.
    `;
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    attendanceGrid: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                attendance: {
                                    type: Type.OBJECT,
                                    properties: {
                                        mon: { type: Type.STRING },
                                        tue: { type: Type.STRING },
                                        wed: { type: Type.STRING },
                                        thu: { type: Type.STRING },
                                        fri: { type: Type.STRING },
                                    }
                                },
                                weeklyPercentage: { type: Type.NUMBER }
                            }
                        }
                    },
                    summary: {
                        type: Type.OBJECT,
                        properties: {
                            overallPercentage: { type: Type.NUMBER },
                            perfectAttendance: { type: Type.ARRAY, items: { type: Type.STRING } },
                            lowAttendance: { type: Type.ARRAY, items: { type: Type.STRING } },
                        }
                    },
                    recommendations: { type: Type.STRING }
                }
            }
        }
     });

     return JSON.parse(response.text) as WeeklyTraineeReportData;
};

/**
 * Extracts schedule information from an image of an attendance form.
 * @param imageBase64 The base64-encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A structured data object with the extracted schedule.
 */
export const extractScheduleFromImage = async (imageBase64: string, mimeType: string): Promise<WeeklyTrainerReportData> => {
    const prompt = `You are an intelligent document processing assistant specialized in extracting structured data from educational forms. Analyze the provided image of a "CLASS ATTENDANCE QUALITY CONTROL FORM".

Your task is to extract all the relevant information and return it as a single, valid JSON object. Do not include any markdown formatting like \`\`\`json.

Extract the following fields from the top of the form:
- "department"
- "className" (labeled as "Class:")
- "classRepName"

Extract the schedule for each day from Monday to Friday. The time slots are: "08:00-10:00", "10:00-12:00", "12:00-13:00", "13:00-15:00", "15:00-17:00".

For each cell in the schedule grid that is filled, extract:
- "subject": The subject taught.
- "trainer": The name of the trainer.
- "status": The attendance status, which should be one of "Taught", "Not Taught", or "Assignment", based on the "T/NT/ASS" key.

If a date is provided for a specific day, extract it.

The final JSON object should strictly follow the provided schema. If a field is not present in the image, omit it from the JSON or set its value to an empty string. Make sure all text is accurately transcribed.`;

    const imagePart = {
        inlineData: {
            data: imageBase64,
            mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        department: { type: Type.STRING, description: "The department name from the form." },
                        className: { type: Type.STRING, description: "The class name from the form." },
                        classRepName: { type: Type.STRING, description: "The Class Rep Name from the form." },
                        schedule: {
                            type: Type.OBJECT,
                            properties: {
                                monday: { type: Type.OBJECT, description: "Schedule for Monday. Keys are timeslots, values are session objects." },
                                tuesday: { type: Type.OBJECT },
                                wednesday: { type: Type.OBJECT },
                                thursday: { type: Type.OBJECT },
                                friday: { type: Type.OBJECT },
                            }
                        },
                        dates: {
                            type: Type.OBJECT,
                            properties: {
                                monday: { type: Type.STRING },
                                tuesday: { type: Type.STRING },
                                wednesday: { type: Type.STRING },
                                thursday: { type: Type.STRING },
                                friday: { type: Type.STRING },
                            }
                        }
                    }
                }
            },
        });

        return JSON.parse(response.text) as WeeklyTrainerReportData;
    } catch (error) {
        console.error("Error extracting schedule from image:", error);
        throw new Error("Failed to extract schedule. The AI model could not process the image.");
    }
};