using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

internal static class SlideshowHelperSmoke
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateWindowEx(int exStyle, string className, string title, int style,
        int x, int y, int width, int height, IntPtr parent, IntPtr id, IntPtr instance, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnableWindow(IntPtr window, bool enabled);
    [DllImport("comctl32.dll")] private static extern void InitCommonControls();
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect bounds);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect { public int Left, Top, Right, Bottom; }

    private static void Wait(int milliseconds)
    {
        Stopwatch watch = Stopwatch.StartNew();
        while (watch.ElapsedMilliseconds < milliseconds)
        {
            Application.DoEvents();
            Thread.Sleep(20);
        }
    }

    [STAThread]
    private static int Main(string[] args)
    {
        string helper = args[0];
        string images = args[1];
        string diagnostics = args[2];
        Form form = new Form();
        form.Text = "BARZ hidden slideshow check";
        form.StartPosition = FormStartPosition.Manual;
        form.Location = new Point(-10000, -10000);
        form.Size = new Size(760, 800);
        form.ShowInTaskbar = false;
        form.Show();
        InitCommonControls();
        IntPtr progress = CreateWindowEx(0, "msctls_progress32", "", 0x50000000,
            25, 190, 690, 20, form.Handle, new IntPtr(3002), IntPtr.Zero, IntPtr.Zero);
        IntPtr next = CreateWindowEx(0, "BUTTON", "Next", 0x50000000,
            520, 695, 90, 32, form.Handle, new IntPtr(1), IntPtr.Zero, IntPtr.Zero);
        EnableWindow(next, false);
        IntPtr picture = CreateWindowEx(0, "STATIC", "", 0x5000000e,
            0, 580, 740, 130, form.Handle, new IntPtr(3001), IntPtr.Zero, IntPtr.Zero);
        Process process = Process.Start(new ProcessStartInfo(helper,
            form.Handle.ToInt64() + " \"" + images + "\" 40 \"" + diagnostics + "\"")
        { UseShellExecute = false, CreateNoWindow = true });
        Wait(1200);
        Rect large;
        GetWindowRect(picture, out large);
        bool expanded = large.Bottom - large.Top > 200;
        Wait(1700);
        Wait(2800);
        EnableWindow(next, true);
        Wait(500);
        Rect restored;
        GetWindowRect(picture, out restored);
        bool compact = restored.Bottom - restored.Top == 130;
        form.Close();
        process.WaitForExit(5000);
        string log = File.ReadAllText(diagnostics);
        bool rotated = log.Contains("poster-2") && log.Contains("poster-3");
        Console.WriteLine("expanded=" + expanded + " rotated=" + rotated + " restored=" + compact +
            " helperExit=" + process.ExitCode);
        return expanded && rotated && compact && process.ExitCode == 0 ? 0 : 1;
    }
}
