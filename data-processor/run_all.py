"""
Master script to run all data processing steps
"""

import subprocess
import sys

def run_script(script_name, description):
    """Run a Python script and handle errors"""
    print("\n" + "=" * 60)
    print(f"Running: {description}")
    print("=" * 60)
    
    try:
        result = subprocess.run(
            [sys.executable, script_name],
            check=True,
            capture_output=False
        )
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with error code {e.returncode}")
        return False

def main():
    """Main execution"""
    print("""
╔═══════════════════════════════════════════════════════════╗
║   AYUSH-FHIR Data Processing Pipeline                    ║
║   Extracting NAMASTE & WHO Terminologies                 ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    steps = [
        ("parse_namaste.py", "Parse NAMASTE Excel Files"),
        ("parse_who_terminologies.py", "Extract WHO Terminologies from PDFs"),
        ("extract_who_mappings.py", "Extract WHO Codes and Create Mappings")
    ]
    
    success_count = 0
    
    for script, description in steps:
        if run_script(script, description):
            success_count += 1
        else:
            print(f"\n⚠️  Stopping pipeline due to error in: {description}")
            break
    
    print("\n" + "=" * 60)
    print(f"Pipeline completed: {success_count}/{len(steps)} steps successful")
    print("=" * 60)
    
    if success_count == len(steps):
        print("\n🎉 All data processing completed successfully!")
        print("\nYou can now:")
        print("  1. Start the backend server: cd ../backend && npm run dev")
        print("  2. Start the frontend: cd ../frontend && npm run dev")
        print("  3. Login and explore the data!")
    else:
        print("\n⚠️  Some steps failed. Please check the errors above.")

if __name__ == "__main__":
    main()
