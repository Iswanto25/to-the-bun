import { test, expect, mock } from "bun:test";

process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "user@example.com";
process.env.SMTP_PASS = "password";
process.env.SMTP_FROM = "no-reply@example.com";
process.env.APP_NAME = "Boilerplate App";

const sendMailMock = mock(async () => {});
const createTransportMock = mock(() => ({ sendMail: sendMailMock }));

mock.module("nodemailer", () => ({
	default: {
		createTransport: createTransportMock,
	},
}));

const { sendEmail, isSMTPConfigured } = await import("@/utils/smtp.js");

test("isSMTPConfigured is true when env vars are set", () => {
	expect(isSMTPConfigured).toBe(true);
});

test("sendEmail constructs transporter and sends mail", async () => {
	createTransportMock.mockClear();
	sendMailMock.mockClear();
	sendMailMock.mockResolvedValue(undefined);

	const payload = {
		to: "recipient@example.com",
		subject: "Hello",
		html: "<p>Hi</p>",
	};

	await sendEmail(payload);

	expect(createTransportMock).toHaveBeenCalledTimes(1);
	expect(sendMailMock).toHaveBeenCalledTimes(1);

	const mailArgs = sendMailMock.mock.calls[0] as any;
	expect(mailArgs?.[0]?.to).toBe("recipient@example.com");
	expect(mailArgs?.[0]?.subject).toBe("Hello");
	expect(mailArgs?.[0]?.from).toBe(`"Boilerplate App" <no-reply@example.com>`);
});

test("sendEmail surfaces transport errors gracefully", async () => {
	sendMailMock.mockClear();
	sendMailMock.mockRejectedValue(new Error("SMTP failure"));

	const consoleWarnSpy = mock(() => {});
	const originalWarn = console.warn;
	console.warn = consoleWarnSpy;

	try {
		await sendEmail({ to: "x@y.com", subject: "Hi" });

		expect(consoleWarnSpy).toHaveBeenCalled();
	} finally {
		console.warn = originalWarn;
	}
});
