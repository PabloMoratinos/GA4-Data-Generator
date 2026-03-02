export const README_CONTENT = `
# GA4 Data Generator - Agent

## What is GA4 Data Generator?
GA4 Data Generator is a web application designed to act as an automated agent that injects synthetic (fake) data directly into your Google Analytics 4 property. It uses the GA4 **Measurement Protocol** to simulate traffic, sessions, users, and e-commerce or custom events continuously and realistically.

Its interface, inspired by a technical control panel ("mission control"), allows you to configure the frequency of events, select which standard events to simulate, and define your own custom events, all while monitoring the data flow in real-time.

---

## Use Cases

1. **Implementation Testing and Debugging**: 
   Before launching a new website or campaign, you can generate fake traffic to verify that your GA4 reports, conversion funnels, and Looker Studio dashboards are reading and processing data correctly.
2. **Training and Demonstrations**:
   Ideal for agencies or teachers who need to show how GA4 works to clients or students in a test account, without having to wait days for real traffic to accumulate.
3. **E-commerce Event Validation**:
   Verify that complex events like \`purchase\` or \`add_to_cart\` are correctly sending the product arrays (\`items\`), prices, and currencies required by GA4.
4. **Custom Events Testing**:
   Validate that the custom parameters you have defined (e.g., \`formID\`, \`formProfile\`) are correctly collected in GA4 before asking the development team to implement them in production code.

---

## User Manual

### 1. Initial Configuration
For the agent to communicate with your GA4 account, you need to provide two key pieces of information:
- **Measurement ID**: The identifier of your web data stream (usually starts with \`G-\`). You will find it in *Admin > Data Streams* in your GA4 account.
- **API Secret**: A secret key to authorize data sending. It is generated in *Admin > Data Streams > (Your stream) > Measurement Protocol API secrets*.
- **Events / Minute**: Use the slider to define the speed at which the agent will send events (from 1 to 600 events per minute).
- **Blueprints (Export/Import)**: In the top right corner of this panel, you will see buttons to **Export** and **Import**. This allows you to download your entire current configuration (credentials, selected standard events, weights, and custom events) into a JSON file. You can then share this file or load it in the future to instantly recover your test environment.

### 2. Standard Events Selection
In this panel, you will see a list of predefined GA4 events (e.g., \`page_view\`, \`scroll\`, \`purchase\`, \`login\`). 
- Check or uncheck the boxes according to the type of traffic you want to simulate.
- **Frequency Control (Weight)**: When you check an event, a "Weight" slider from 1 to 10 will appear. This allows you to control the probability of that event firing compared to the others. An event with a weight of 10 will be sent 10 times more often than an event with a weight of 1.
- **E-commerce Note**: The \`view_item\`, \`add_to_cart\`, \`begin_checkout\`, and \`purchase\` events automatically generate fake products (with SKU, name, category, and price) to simulate real transactions.

### 3. Custom Events
If you need to send events that are not in the standard list (e.g., \`generate_lead\`), you can create them here:
- **Manual Creation**: Type the event name, add the parameters (Key/Value), adjust its **Weight** (relative frequency), and click **"Add Event"**.
- **Frequency Control (Weight)**: Just like with standard events, you can adjust the weight of each custom event already created so that it fires more or less frequently.
- **Bulk Upload (CSV)**: 
  - Click on **"Template"** to download a sample CSV file.
  - Fill in the CSV following the structure: \`event_name\`, \`param_key\`, \`param_value\`.
  - Click on **"Upload"** to load your file. Loaded events will have a default weight of 1, which you can later adjust in the interface.

### 4. Execution and Monitoring
- **Start Agent**: Once everything is configured, click this green button. The agent will start generating users (\`client_id\`), sessions, and assign random traffic sources (organic, cpc, social, etc.) to the events based on the weights you have defined.
- **Live Event Stream**: On the right side of the screen, you will see a real-time terminal. Each block represents an event sent to GA4.
  - **Green**: The event was sent successfully. You can see the exact JSON payload that was sent.
  - **Red**: There was an error (usually due to incorrect credentials).
  - **Auto-scroll**: You can disable the padlock in the terminal header to freely navigate through the history without the screen jumping to the bottom with each new event.
- **Session Stats**: A quick summary of how many events have been sent in the current session, your success rate, and the error count.
- **Stop Agent**: Click the red button to stop the simulation at any time.

---

## Author
Created by **Pablo Moratinos** ([LinkedIn](https://www.linkedin.com/in/pmoratinos/)), CRO Team Lead at **Product Hackers, The Growth Company** ([producthackers.com](https://www.producthackers.com/)).
`;
